# netflix-mirror: DevSecOps on AWS with GitLab CI

<div align="center">
  <img src="./public/assets/netflix-logo.png" alt="netflix-mirror logo" width="100" height="32">
  <br><br>
  <img src="./public/assets/home-page.png" alt="Home page" width="100%">
  <p>Home Page</p>
</div>

A React + TMDB streaming-UI clone with a serverless profile-picture backend, shipped through a DevSecOps pipeline:
**GitLab CI → SonarQube / Trivy → Amazon ECR → Amazon EKS (via ArgoCD)**, monitored with **Prometheus + Grafana**,
with **S3 + Lambda + API Gateway + Cognito** for profile pictures and **SNS** for notifications.

All servers use **Amazon Linux 2023** (default user `ec2-user`, package manager `dnf`).

---

## Architecture and AWS services

```
Developer ─► GitLab (repo + CI) ─► GitLab Runner (EC2, Amazon Linux 2023)
                                     ├─► SonarQube (code quality / SAST)
                                     ├─► Trivy (dependency, secret, image CVEs)
                                     ├─► Amazon ECR (image registry) ──► EventBridge ─► Lambda ─► SNS
                                     └─► Lambda deploy (update-function-code)
                                                │
                    GitLab CI commits new image tag to k8s/ manifests
                                                │
                              ArgoCD (in EKS) syncs ─► Amazon EKS (managed node group)
                                                              │
              Prometheus + Grafana (EC2) ◄── node exporter ───┘

Browser ─► Cognito (login) ─► API Gateway (JWT authorizer) ─► Lambda (profile-api)
   │                                                              │ presigned URLs
   └──────── upload directly ──────────────► S3 (uploads/) ─► Lambda (process-picture) ─► S3 (profiles/)
```

| AWS service                       | Purpose in this project                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **EC2** (Amazon Linux 2023)       | Tools server: GitLab Runner, SonarQube, Prometheus, Grafana                                                    |
| **VPC, Security Groups**          | Network isolation; open only the ports you need, restricted to your IP                                         |
| **IAM** (roles, instance profile) | Credentials for the runner, Lambdas, and EKS, with no access keys stored anywhere (see below)                  |
| **ECR**                           | Private Docker registry; scan-on-push enabled                                                                  |
| **EKS** (managed node groups)     | Runs the app and ArgoCD                                                                                        |
| **S3**                            | Stores user profile pictures (private bucket)                                                                  |
| **Lambda**                        | `profile-api` (presigned URLs), `process-picture` (validates uploads), `ecr-scan-alert` (vulnerability alerts) |
| **API Gateway (HTTP API)**        | Public HTTPS entry point to the profile Lambda                                                                 |
| **Cognito**                       | User sign-up/login; gives each user a stable ID for their picture                                              |
| **EventBridge**                   | Triggers `ecr-scan-alert` when an ECR image scan finishes                                                      |
| **SNS**                           | Email notifications: pipeline failures, vulnerable images, alarms                                              |
| **CloudWatch**                    | Lambda/EC2 logs and alarms (alarms publish to SNS)                                                             |
| **Elastic Load Balancing**        | Public access to ArgoCD and, in production, the app                                                            |

---

## Phase 0: AWS foundation

Configure the AWS CLI on your workstation (`aws configure`), or use AWS CloudShell. Replace `us-east-1` and `<ACCOUNT_ID>` with your own.

**1. ECR repository (scan on push)**

```bash
aws ecr create-repository \
  --repository-name netflix-mirror \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

Registry URI: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/netflix-mirror`.

**2. SNS topic**

```bash
aws sns create-topic --name netflix-mirror-alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts \
  --protocol email --notification-endpoint you@example.com
```

Confirm the subscription from your inbox.

**3. IAM role for the tools EC2 instance**

Create an EC2 role named `netflix-mirror-tools-role` with the policy below, and attach it to the instance as an instance profile.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:us-east-1:<ACCOUNT_ID>:repository/netflix-mirror"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:UpdateFunctionCode",
      "Resource": "arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:netflix-mirror-*"
    }
  ]
}
```

**4. Security group for the tools server**

Allow inbound only from your IP (`<your-ip>/32`):

| Port | Service    |
| ---- | ---------- |
| 22   | SSH        |
| 9000 | SonarQube  |
| 9090 | Prometheus |
| 3000 | Grafana    |

Port 9100 (Node Exporter) must be reachable from the tools server to the EKS nodes (a security group rule between the two groups). The runner metrics port 9252 is scraped locally and needs no inbound rule.

---

## Phase 1: Initial setup and deployment

**Step 1: Launch EC2 (Amazon Linux 2023)**

- AMI: **Amazon Linux 2023**, instance type `t3.large` (SonarQube needs memory), 30 GB gp3 volume.
- Attach the `netflix-mirror-tools-role` instance profile and the security group from Phase 0.
- Set **IMDSv2 required** and **hop limit = 2**, so containers started by the runner can use the instance role:

  ```bash
  aws ec2 modify-instance-metadata-options \
    --instance-id <instance-id> \
    --http-tokens required \
    --http-put-response-hop-limit 2
  ```

- Connect: `ssh -i <key>.pem ec2-user@<public-ip>`.

**Step 2: Update packages and clone the code**

```bash
sudo dnf update -y
sudo dnf install -y git
git clone https://gitlab.com/<your-group>/netflix-mirror.git
cd netflix-mirror
```

To import the original source into your GitLab project:

```bash
git remote set-url origin https://gitlab.com/<your-group>/netflix-mirror.git
git push -u origin main
```

**Step 3: Install Docker and run the app**

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
newgrp docker
```

Build and run:

```bash
docker build -t netflix-mirror .
docker run -d --name netflix-mirror -p 8081:80 netflix-mirror:latest
```

It will show an error until you provide a TMDB API key.

**Step 4: Get the TMDB API key**

- Create an account on the TMDB website.
- Profile → **Settings** → **API** → create a key (accept the terms, fill in basic details).
- Rebuild with your key:

```bash
docker build --build-arg TMDB_V3_API_KEY=<your-api-key> -t netflix-mirror .
```

Note: this is a client-side app, so the key ends up in the built JavaScript. Use a key you can rotate and keep it out of Git (store it as a masked GitLab CI variable).

---

## Phase 2: Security

**SonarQube** (needs a kernel setting for its embedded search engine):

```bash
sudo sysctl -w vm.max_map_count=524288
echo "vm.max_map_count=524288" | sudo tee /etc/sysctl.d/99-sonarqube.conf

docker run -d --name sonar -p 9000:9000 sonarqube:lts-community
```

Open `http://<public-ip>:9000` (default `admin` / `admin`; you will be asked to change it).

1. **Projects → Create project → Manually**: key `netflix-mirror`, name `netflix-mirror`.
2. Generate a token and keep it for Phase 3 (`SONAR_TOKEN`).

Add `sonar-project.properties` at the repo root:

```properties
sonar.projectKey=netflix-mirror
sonar.projectName=netflix-mirror
sonar.sources=src,lambda
sonar.exclusions=**/node_modules/**,**/build/**,**/dist/**
```

**Trivy** runs inside the pipeline as a container, so nothing needs to be installed on the server. To scan manually from the terminal:

```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin
trivy image netflix-mirror:latest
```

---

## Phase 3: CI/CD with GitLab

### 3.1 Install and register a GitLab Runner (Amazon Linux 2023)

```bash
sudo curl -L --output /usr/local/bin/gitlab-runner \
  https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64
sudo chmod +x /usr/local/bin/gitlab-runner

sudo useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash
sudo usermod -aG docker gitlab-runner
sudo gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
sudo gitlab-runner start
```

(For a Graviton/ARM instance, use the `linux-arm64` binary instead.)

In GitLab: **Settings → CI/CD → Runners → New project runner**, add the tag `aws`, and copy the token (starts with `glrt-`). Register:

```bash
sudo gitlab-runner register \
  --non-interactive \
  --url https://gitlab.com \
  --token <glrt-your-runner-token> \
  --executor docker \
  --docker-image docker:27 \
  --docker-privileged \
  --description "netflix-mirror-ec2-runner"
```

Add this line at the top of `/etc/gitlab-runner/config.toml` so Prometheus can scrape the runner, then restart:

```toml
listen_address = ":9252"
```

```bash
sudo gitlab-runner restart
sudo gitlab-runner verify
```

For self-managed GitLab, change `--url` to your server.

### 3.2 CI/CD variables

**Settings → CI/CD → Variables** (mark secrets _Masked_):

| Variable            | Value                                                         |
| ------------------- | ------------------------------------------------------------- |
| `AWS_REGION`        | `us-east-1`                                                   |
| `ECR_REPO_URI`      | `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/netflix-mirror` |
| `SNS_TOPIC_ARN`     | `arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts`    |
| `SONAR_HOST_URL`    | `http://<tools-server-private-ip>:9000`                       |
| `SONAR_TOKEN`       | token from Phase 2 (Masked)                                   |
| `TMDB_V3_API_KEY`   | your TMDB key (Masked)                                        |
| `API_URL`           | API Gateway URL from Phase 4                                  |
| `GITLAB_PUSH_TOKEN` | project access token with `write_repository` (Masked)         |

### 3.3 Kubernetes manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: netflix-mirror
  labels:
    app: netflix-mirror
spec:
  replicas: 2
  selector:
    matchLabels:
      app: netflix-mirror
  template:
    metadata:
      labels:
        app: netflix-mirror
    spec:
      containers:
        - name: netflix-mirror
          image: <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/netflix-mirror:latest
          ports:
            - containerPort: 80
```

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: netflix-mirror
spec:
  type: NodePort
  selector:
    app: netflix-mirror
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30007
```

### 3.4 `.gitlab-ci.yml`

```yaml
stages:
  - sast
  - scan
  - build
  - image-scan
  - deploy

default:
  tags:
    - aws

variables:
  IMAGE_TAG: $CI_COMMIT_SHORT_SHA

# ---------- SonarQube analysis + quality gate ----------
sonarqube_analysis:
  stage: sast
  image:
    name: sonarsource/sonar-scanner-cli:latest
    entrypoint: [""]
  variables:
    SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar"
    GIT_DEPTH: "0"
  script:
    - sonar-scanner
        -Dsonar.projectKey=netflix-mirror
        -Dsonar.projectName=netflix-mirror
        -Dsonar.host.url=$SONAR_HOST_URL
        -Dsonar.token=$SONAR_TOKEN
        -Dsonar.qualitygate.wait=true
  allow_failure: true   # set to false to make the quality gate block the pipeline

# ---------- Trivy filesystem scan (dependencies, secrets, misconfigurations) ----------
trivy_fs_scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy fs . > trivyfs.txt
  artifacts:
    when: always
    paths:
      - trivyfs.txt
    expire_in: 7 days

# ---------- Build image and push to Amazon ECR ----------
docker_build_push:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  before_script:
    - apk add --no-cache aws-cli
    - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${ECR_REPO_URI%%/*}
  script:
    - docker build
        --build-arg TMDB_V3_API_KEY=$TMDB_V3_API_KEY
        --build-arg API_URL=$API_URL
        -t $ECR_REPO_URI:$IMAGE_TAG -t $ECR_REPO_URI:latest .
    - docker push $ECR_REPO_URI:$IMAGE_TAG
    - docker push $ECR_REPO_URI:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# ---------- Trivy image scan ----------
trivy_image_scan:
  stage: image-scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image $ECR_REPO_URI:$IMAGE_TAG > trivyimage.txt
  artifacts:
    when: always
    paths:
      - trivyimage.txt
    expire_in: 7 days
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# ---------- GitOps deploy: update manifest, ArgoCD syncs to EKS ----------
update_manifest:
  stage: deploy
  image:
    name: alpine/git:latest
    entrypoint: [""]
  script:
    - sed -i "s|image: .*|image: ${ECR_REPO_URI}:${IMAGE_TAG}|" k8s/deployment.yaml
    - git config user.email "ci@netflix-mirror.local"
    - git config user.name "gitlab-ci"
    - git add k8s/deployment.yaml
    - git commit -m "ci - deploy ${IMAGE_TAG} [skip ci]"
    - git push "https://oauth2:${GITLAB_PUSH_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git" HEAD:main
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# ---------- Deploy Lambda code when it changes ----------
deploy_lambdas:
  stage: deploy
  image:
    name: amazon/aws-cli:latest
    entrypoint: [""]
  script:
    - yum install -y zip
    - |
      for fn in profile-api process-picture ecr-scan-alert; do
        (cd lambda/$fn && zip -q -r ../../$fn.zip .)
        aws lambda update-function-code --region $AWS_REGION \
          --function-name netflix-mirror-$fn --zip-file fileb://$fn.zip
      done
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      changes:
        - lambda/**/*

# ---------- Notification on failure (Amazon SNS) ----------
notify_failure:
  stage: .post
  image:
    name: amazon/aws-cli:latest
    entrypoint: [""]
  script:
    - aws sns publish --region $AWS_REGION --topic-arn $SNS_TOPIC_ARN
        --subject "netflix-mirror pipeline FAILED"
        --message "Pipeline $CI_PIPELINE_ID failed on $CI_COMMIT_REF_NAME. $CI_PIPELINE_URL"
  when: on_failure
```

Your Dockerfile needs an `ARG API_URL` handled the same way as `TMDB_V3_API_KEY`, so the frontend knows where the API lives.

**Troubleshooting**

- `Cannot connect to the Docker daemon`: the runner must be registered with `--docker-privileged` and the job must use the `docker:27-dind` service.
- `Unable to locate credentials` in a job: the instance metadata hop limit must be 2 and the instance profile must be attached.
- Pipeline loops: the `[skip ci]` in the manifest commit message prevents the deploy commit from re-triggering CI.

---

## Phase 4: Profile pictures with S3, Lambda, API Gateway and Cognito

**Flow:** the user signs in with Cognito → the frontend asks `profile-api` for an upload URL → the browser uploads **directly to S3** (the file never passes through Lambda) → S3 triggers `process-picture`, which checks that the file is really an image and moves it to `profiles/<user-id>/avatar`.

### 4.1 S3 bucket (private)

```bash
export BUCKET=netflix-mirror-profile-pics-<ACCOUNT_ID>

aws s3api create-bucket --bucket $BUCKET --region us-east-1
# (outside us-east-1 add: --create-bucket-configuration LocationConstraint=<region>)

aws s3api put-public-access-block --bucket $BUCKET \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

New buckets are encrypted at rest with SSE-S3 by default. Browser uploads need CORS (`cors.json`):

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://<your-app-domain>", "http://localhost:3000"],
      "AllowedMethods": ["GET", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

```bash
aws s3api put-bucket-cors --bucket $BUCKET --cors-configuration file://cors.json
```

Delete unprocessed uploads automatically after a day (`lifecycle.json`):

```json
{
  "Rules": [
    {
      "ID": "expire-uploads",
      "Filter": { "Prefix": "uploads/" },
      "Status": "Enabled",
      "Expiration": { "Days": 1 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET --lifecycle-configuration file://lifecycle.json
```

### 4.2 Cognito user pool

```bash
aws cognito-idp create-user-pool --pool-name netflix-mirror-users \
  --username-attributes email --auto-verified-attributes email

aws cognito-idp create-user-pool-client --user-pool-id <USER_POOL_ID> \
  --client-name netflix-mirror-web --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

Use the `amazon-cognito-identity-js` or AWS Amplify Auth library in the React app to sign users in and obtain a token.

### 4.3 Lambda execution role

`lambda-trust.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

`lambda-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::netflix-mirror-profile-pics-<ACCOUNT_ID>/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::netflix-mirror-profile-pics-<ACCOUNT_ID>"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts"
    }
  ]
}
```

```bash
aws iam create-role --role-name netflix-mirror-lambda-role --assume-role-policy-document file://lambda-trust.json
aws iam attach-role-policy --role-name netflix-mirror-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name netflix-mirror-lambda-role \
  --policy-name netflix-mirror-lambda-access --policy-document file://lambda-policy.json
```

### 4.4 Lambda functions (Python 3.12)

Repo layout:

```
lambda/
├── profile-api/handler.py
├── process-picture/handler.py
└── ecr-scan-alert/handler.py
```

**`lambda/profile-api/handler.py`**: returns a presigned upload form and a presigned URL to view the picture.

```python
import json
import os
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

s3 = boto3.client("s3", config=Config(signature_version="s3v4"))
BUCKET = os.environ["BUCKET"]
ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_BYTES = 2 * 1024 * 1024  # 2 MB


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def handler(event, context):
    user_id = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    route = event["routeKey"]

    if route == "POST /profile/picture/upload-url":
        content_type = json.loads(event.get("body") or "{}").get("contentType")
        if content_type not in ALLOWED:
            return respond(400, {"error": "Only JPEG, PNG or WebP images are allowed"})
        key = f"uploads/{user_id}/{uuid.uuid4()}.{ALLOWED[content_type]}"
        post = s3.generate_presigned_post(
            Bucket=BUCKET,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, MAX_BYTES],
            ],
            ExpiresIn=300,
        )
        return respond(200, post)

    if route == "GET /profile/picture":
        key = f"profiles/{user_id}/avatar"
        try:
            s3.head_object(Bucket=BUCKET, Key=key)
        except ClientError:
            return respond(200, {"url": None})
        url = s3.generate_presigned_url(
            "get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600
        )
        return respond(200, {"url": url})

    return respond(404, {"error": "Not found"})
```

**`lambda/process-picture/handler.py`**: triggered by S3 when a file lands in `uploads/`.

```python
import urllib.parse

import boto3

s3 = boto3.client("s3")


def detect_type(head: bytes):
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head[0:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
        user_id = key.split("/")[1]

        head = s3.get_object(Bucket=bucket, Key=key, Range="bytes=0-11")["Body"].read()
        content_type = detect_type(head)

        if content_type:
            s3.copy_object(
                Bucket=bucket,
                Key=f"profiles/{user_id}/avatar",
                CopySource={"Bucket": bucket, "Key": key},
                ContentType=content_type,
                MetadataDirective="REPLACE",
            )
        else:
            print(f"Rejected non-image upload: {key}")

        s3.delete_object(Bucket=bucket, Key=key)
```

**`lambda/ecr-scan-alert/handler.py`**: emails you when a pushed image has HIGH or CRITICAL findings.

```python
import os

import boto3

sns = boto3.client("sns")


def handler(event, context):
    detail = event["detail"]
    counts = detail.get("finding-severity-counts", {})
    critical, high = counts.get("CRITICAL", 0), counts.get("HIGH", 0)
    if critical == 0 and high == 0:
        return

    sns.publish(
        TopicArn=os.environ["SNS_TOPIC_ARN"],
        Subject="netflix-mirror: vulnerable image pushed to ECR",
        Message=(
            f"Repository: {detail.get('repository-name')}\n"
            f"Tags: {detail.get('image-tags')}\n"
            f"CRITICAL: {critical}, HIGH: {high}\n"
            f"Full findings: {counts}"
        ),
    )
```

**Create the functions** (first time only; afterwards GitLab CI updates the code):

```bash
for fn in profile-api process-picture ecr-scan-alert; do
  (cd lambda/$fn && zip -q -r ../../$fn.zip .)
done

ROLE=arn:aws:iam::<ACCOUNT_ID>:role/netflix-mirror-lambda-role

aws lambda create-function --function-name netflix-mirror-profile-api \
  --runtime python3.12 --handler handler.handler --role $ROLE --timeout 10 \
  --zip-file fileb://profile-api.zip --environment "Variables={BUCKET=$BUCKET}"

aws lambda create-function --function-name netflix-mirror-process-picture \
  --runtime python3.12 --handler handler.handler --role $ROLE --timeout 15 \
  --zip-file fileb://process-picture.zip

aws lambda create-function --function-name netflix-mirror-ecr-scan-alert \
  --runtime python3.12 --handler handler.handler --role $ROLE --timeout 10 \
  --zip-file fileb://ecr-scan-alert.zip \
  --environment "Variables={SNS_TOPIC_ARN=arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts}"
```

### 4.5 Connect S3 → Lambda (processing)

```bash
aws lambda add-permission --function-name netflix-mirror-process-picture \
  --statement-id s3invoke --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::$BUCKET --source-account <ACCOUNT_ID>
```

`s3-notification.json`:

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:netflix-mirror-process-picture",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": { "FilterRules": [{ "Name": "prefix", "Value": "uploads/" }] }
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-notification-configuration --bucket $BUCKET \
  --notification-configuration file://s3-notification.json
```

### 4.6 Connect ECR scan results → Lambda (alerts)

`ecr-scan-pattern.json`:

```json
{
  "source": ["aws.ecr"],
  "detail-type": ["ECR Image Scan"],
  "detail": { "repository-name": ["netflix-mirror"] }
}
```

```bash
aws events put-rule --name netflix-mirror-ecr-scan --event-pattern file://ecr-scan-pattern.json

aws lambda add-permission --function-name netflix-mirror-ecr-scan-alert \
  --statement-id eventbridge --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:<ACCOUNT_ID>:rule/netflix-mirror-ecr-scan

aws events put-targets --rule netflix-mirror-ecr-scan \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:netflix-mirror-ecr-scan-alert"
```

### 4.7 API Gateway (HTTP API with Cognito JWT authorizer)

```bash
API_ID=$(aws apigatewayv2 create-api --name netflix-mirror-api --protocol-type HTTP \
  --cors-configuration AllowOrigins=https://<your-app-domain>,http://localhost:3000,AllowMethods=GET,POST,OPTIONS,AllowHeaders=authorization,content-type \
  --query ApiId --output text)

AUTH_ID=$(aws apigatewayv2 create-authorizer --api-id $API_ID --name cognito \
  --authorizer-type JWT --identity-source '$request.header.Authorization' \
  --jwt-configuration Audience=<APP_CLIENT_ID>,Issuer=https://cognito-idp.us-east-1.amazonaws.com/<USER_POOL_ID> \
  --query AuthorizerId --output text)

INT_ID=$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:netflix-mirror-profile-api \
  --payload-format-version 2.0 --query IntegrationId --output text)

for ROUTE in "POST /profile/picture/upload-url" "GET /profile/picture"; do
  aws apigatewayv2 create-route --api-id $API_ID --route-key "$ROUTE" \
    --target integrations/$INT_ID --authorization-type JWT --authorizer-id $AUTH_ID
done

aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy

aws lambda add-permission --function-name netflix-mirror-profile-api \
  --statement-id apigw --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:<ACCOUNT_ID>:$API_ID/*/*"
```

The API URL is `https://<API_ID>.execute-api.us-east-1.amazonaws.com`; save it as the `API_URL` CI variable.

### 4.8 Frontend upload example

```js
const API = process.env.REACT_APP_API_URL; // however your bundler exposes API_URL

export async function uploadAvatar(file, token) {
  const res = await fetch(`${API}/profile/picture/upload-url`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  const { url, fields } = await res.json();

  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", file); // must be the last field

  const upload = await fetch(url, { method: "POST", body: form });
  if (!upload.ok) throw new Error("Upload failed");
}

export async function getAvatarUrl(token) {
  const res = await fetch(`${API}/profile/picture`, {
    headers: { Authorization: token },
  });
  return (await res.json()).url; // null if the user has no picture yet
}
```

The processed picture appears a second or two after the upload finishes, so fetch the URL after a short delay or retry once.

---

## Phase 5: Monitoring and notifications

### Install Prometheus

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.47.1/prometheus-2.47.1.linux-amd64.tar.gz
tar -xvf prometheus-2.47.1.linux-amd64.tar.gz
cd prometheus-2.47.1.linux-amd64/
sudo mkdir -p /data /etc/prometheus
sudo mv prometheus promtool /usr/local/bin/
sudo mv prometheus.yml /etc/prometheus/prometheus.yml
sudo chown -R prometheus:prometheus /etc/prometheus/ /data/
```

> Use the latest stable release from the Prometheus releases page if you prefer.

`sudo nano /etc/systemd/system/prometheus.service`:

```ini
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/data \
  --web.listen-address=0.0.0.0:9090 \
  --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now prometheus
sudo systemctl status prometheus
```

Open `http://<your-server-ip>:9090`.

### Install Node Exporter

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar -xvf node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter*
```

`sudo nano /etc/systemd/system/node_exporter.service`:

```ini
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

### Configure Prometheus targets

`/etc/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node_exporter"
    static_configs:
      - targets: ["localhost:9100"]

  - job_name: "gitlab-runner"
    static_configs:
      - targets: ["localhost:9252"]
```

```bash
promtool check config /etc/prometheus/prometheus.yml
curl -X POST http://localhost:9090/-/reload
```

Check `http://<your-prometheus-ip>:9090/targets`; every job should be **UP**.

### Install Grafana (Amazon Linux 2023)

```bash
sudo tee /etc/yum.repos.d/grafana.repo > /dev/null << 'REPO'
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
REPO

sudo dnf install -y grafana
sudo systemctl enable --now grafana-server
```

Open `http://<your-server-ip>:3000` (default `admin` / `admin`; change the password on first login).

- **Connections → Data sources → Add data source → Prometheus**, URL `http://localhost:9090`, **Save & test**.
- **Dashboards → New → Import**, ID `1860` (Node Exporter Full), pick the Prometheus data source.

### Notifications (all go to the SNS topic)

| Event                                                  | How it reaches SNS                                |
| ------------------------------------------------------ | ------------------------------------------------- |
| Pipeline fails                                         | `notify_failure` job in `.gitlab-ci.yml`          |
| High/critical vulnerabilities in a pushed image        | ECR scan → EventBridge → `ecr-scan-alert` Lambda  |
| High CPU / failed status check on the EC2 tools server | CloudWatch alarm with the SNS topic as its action |

Example CloudWatch alarm:

```bash
aws cloudwatch put-metric-alarm --alarm-name netflix-mirror-tools-cpu \
  --namespace AWS/EC2 --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=<instance-id> \
  --statistic Average --period 300 --evaluation-periods 1 \
  --threshold 80 --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts
```

---

## Phase 6: Kubernetes on Amazon EKS

Run these from AWS CloudShell or your workstation. Install the tools if needed:

```bash
curl -sL "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -m 0755 kubectl /usr/local/bin/kubectl
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Create the cluster with a managed node group

```bash
eksctl create cluster \
  --name netflix-mirror-cluster \
  --region us-east-1 \
  --nodegroup-name netflix-mirror-nodes \
  --node-type t3.medium \
  --nodes 2 --nodes-min 2 --nodes-max 3 \
  --managed

kubectl get nodes
```

This creates the VPC, IAM roles, control plane, and node group. Nodes run Amazon Linux and their role can pull from ECR. Open **NodePort 30007** in the node security group (your IP only).

### Monitor the cluster with Prometheus

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace prometheus-node-exporter
helm install prometheus-node-exporter prometheus-community/prometheus-node-exporter \
  --namespace prometheus-node-exporter
```

Node Exporter listens on port **9100** on each node. Add to `/etc/prometheus/prometheus.yml` on the tools server (allow the security group rule from Phase 0):

```yaml
- job_name: "netflix-mirror-eks"
  metrics_path: "/metrics"
  static_configs:
    - targets: ["<node1-ip>:9100", "<node2-ip>:9100"]
```

```bash
promtool check config /etc/prometheus/prometheus.yml
curl -X POST http://localhost:9090/-/reload
```

### Deploy with ArgoCD

**1. Install ArgoCD**

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

Log in to the load balancer address as `admin`.

**2. Connect your GitLab repository**

**Settings → Repositories → Connect Repo** (HTTPS; use a GitLab deploy token with `read_repository` for private projects).

**3. Create the application**

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: netflix-mirror
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://gitlab.com/<your-group>/netflix-mirror.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```bash
kubectl apply -f argocd-app.yaml
```

**4. Access the app:** `http://<node-public-ip>:30007`.

For production, switch the Service to `type: LoadBalancer` (or an ALB Ingress) and put HTTPS in front of it.

**End-to-end flow:** push to `main` → GitLab CI scans, builds, pushes to ECR (scan on push → alert Lambda if vulnerable) → manifest updated → ArgoCD rolls out to EKS.

---

## Phase 7: Cleanup

Delete in this order to avoid orphaned load balancers and ongoing charges:

```bash
# 1. Kubernetes
kubectl delete -f argocd-app.yaml
kubectl delete svc argocd-server -n argocd
eksctl delete cluster --name netflix-mirror-cluster --region us-east-1

# 2. Serverless backend
aws apigatewayv2 delete-api --api-id <API_ID>
aws events remove-targets --rule netflix-mirror-ecr-scan --ids 1
aws events delete-rule --name netflix-mirror-ecr-scan
for fn in profile-api process-picture ecr-scan-alert; do
  aws lambda delete-function --function-name netflix-mirror-$fn
done
aws cognito-idp delete-user-pool --user-pool-id <USER_POOL_ID>

# 3. Storage and registry (S3 must be emptied first)
aws s3 rm s3://$BUCKET --recursive
aws s3api delete-bucket --bucket $BUCKET
aws ecr delete-repository --repository-name netflix-mirror --force --region us-east-1

# 4. Messaging and alarms
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:<ACCOUNT_ID>:netflix-mirror-alerts
aws cloudwatch delete-alarms --alarm-names netflix-mirror-tools-cpu
```

Then:

- Unregister the runner in GitLab (**Settings → CI/CD → Runners**) and run `sudo gitlab-runner unregister --all-runners` on the server.
- Terminate the tools EC2 instance and delete its volumes, Elastic IPs, and security groups.
- Delete the IAM roles `netflix-mirror-tools-role` and `netflix-mirror-lambda-role` (detach policies first), plus the Lambda CloudWatch log groups (`/aws/lambda/netflix-mirror-*`).
- Check **Billing → Cost Explorer** the next day to confirm nothing is still running.

import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import MaxLineTypography from "./MaxLineTypography";
import { formatMinuteToReadable, getRandomNumber } from "src/utils/common";
import AgeLimitChip from "./AgeLimitChip";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { useDetailModal } from "src/providers/DetailModalProvider";
import { useGetEnglishBackdropsQuery } from "src/store/slices/discover";
export default function SimilarVideoCard({ video, mediaType }) {
    const [hovered, setHovered] = useState(false);
    const { data: configuration } = useGetConfigurationQuery(undefined);
    const { setDetailType } = useDetailModal();
    const tvVideo = video;
    const title = video.title || tvVideo.name || video.original_title;
    const date = video.release_date || tvVideo.first_air_date;
    const { data: images } = useGetEnglishBackdropsQuery({ mediaType, id: video.id });
    const backdropPath = images?.backdrops.find((image) => image.iso_639_1 === "en")?.file_path
        || images?.backdrops.find((image) => !image.iso_639_1)?.file_path
        || video.backdrop_path;
    return (<Card>
      <CardActionArea aria-label={`Show details for ${title}`} onClick={() => setDetailType({ mediaType, id: video.id, title })} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}>
      <div style={{
            width: "100%",
            position: "relative",
            paddingTop: "calc(9 / 16 * 100%)",
        }}>
        {backdropPath && configuration?.images.base_url && <img src={`${configuration.images.base_url}w780${backdropPath}`} alt={title} style={{
                top: 0,
                height: "100%",
                position: "absolute",
                boxShadow: hovered ? "0 12px 30px rgba(0,0,0,.7)" : "none",
                transition: "box-shadow .2s ease",
            }}/>}
        <div style={{
            top: 10,
            right: 15,
            position: "absolute",
        }}>
          <Typography variant="subtitle2">{`${formatMinuteToReadable(getRandomNumber(180))}`}</Typography>
        </div>
        <div style={{
            left: 0,
            right: 0,
            bottom: 0,
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingBottom: "4px",
            position: "absolute",
            opacity: hovered ? 1 : 0,
            background: hovered ? "linear-gradient(transparent, rgba(0,0,0,.82))" : "transparent",
            transition: "opacity .18s ease, background .18s ease",
        }}>
          <MaxLineTypography maxLine={1} sx={{ width: "80%", fontWeight: 700, textShadow: hovered ? "0 2px 12px rgba(0,0,0,.95)" : "none" }} variant="subtitle1">
            {title}
          </MaxLineTypography>
        </div>
      </div>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center">
            <div>
              <Typography variant="subtitle2" sx={{ color: "success.main" }}>{`${getRandomNumber(100)}% Match`}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <AgeLimitChip label={`${getRandomNumber(20)}+`}/>
                <Typography variant="body2">
                  {date?.substring(0, 4) || "Release date unavailable"}
                </Typography>
              </Stack>
            </div>
          </Stack>
          <MaxLineTypography maxLine={4} variant="subtitle2">
            {video.overview}
          </MaxLineTypography>
        </Stack>
      </CardContent>
      </CardActionArea>
    </Card>);
}

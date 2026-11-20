import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Slide from "@mui/material/Slide";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AddIcon from "@mui/icons-material/Add";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import Player from "video.js/dist/types/player";

import MaxLineTypography from "./MaxLineTypography";
import PlayButton from "./PlayButton";
import NetflixIconButton from "./NetflixIconButton";
import AgeLimitChip from "./AgeLimitChip";
import QualityChip from "./QualityChip";
import { formatMinuteToReadable } from "src/utils/common";
import SimilarVideoCard from "./SimilarVideoCard";
import { useDetailModal } from "src/providers/DetailModalProvider";
import { useGetSimilarVideosQuery } from "src/store/slices/discover";
import { MEDIA_TYPE } from "src/types/Common";
import VideoJSPlayer from "./watch/VideoJSPlayer";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { MovieDetail } from "src/types/Movie";

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function DetailModal() {
  const { detail, setDetailType } = useDetailModal();
  const { data: similarVideos } = useGetSimilarVideosQuery(
    { mediaType: detail.mediaType ?? MEDIA_TYPE.Movie, id: detail.id ?? 0 },
    { skip: !detail.id }
  );
  const playerRef = useRef<Player | null>(null);
  const [muted, setMuted] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const castRef = useRef<HTMLDivElement>(null);
  const [castAtStart, setCastAtStart] = useState(true);
  const [castAtEnd, setCastAtEnd] = useState(false);
  const { data: configuration } = useGetConfigurationQuery(undefined);
  const detailWithTvName = detail.mediaDetail as
    | (MovieDetail & {
        name?: string;
        first_air_date?: string;
        episode_run_time?: number[];
        release_dates?: {
          results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
        };
        content_ratings?: {
          results: { iso_3166_1: string; rating: string }[];
        };
      })
    | undefined;
  const title = detailWithTvName?.title ?? detailWithTvName?.name;
  const releaseDate =
    detailWithTvName?.release_date ?? detailWithTvName?.first_air_date;
  const duration =
    detailWithTvName?.runtime ?? detailWithTvName?.episode_run_time?.[0] ?? 0;
  const availableTrailers = detail.mediaDetail?.videos.results.filter(
    (video) =>
      video.site === "YouTube" &&
      ["en", "hi"].includes(video.iso_639_1) &&
      ["Trailer", "Teaser"].includes(video.type)
  );
  const preferredTrailerLanguage =
    detailWithTvName?.original_language === "hi" ? "hi" : "en";
  const trailer =
    availableTrailers?.find(
      (video) =>
        video.iso_639_1 === preferredTrailerLanguage &&
        video.type === "Trailer" &&
        video.official
    ) ??
    availableTrailers?.find(
      (video) =>
        video.iso_639_1 === preferredTrailerLanguage && video.type === "Trailer"
    ) ??
    availableTrailers?.find(
      (video) =>
        video.iso_639_1 === preferredTrailerLanguage && video.type === "Teaser"
    ) ??
    availableTrailers?.find(
      (video) => video.type === "Trailer" && video.official
    ) ??
    availableTrailers?.find((video) => video.type === "Trailer") ??
    availableTrailers?.find((video) => video.type === "Teaser");
  const certifications =
    detail.mediaType === MEDIA_TYPE.Tv
      ? detailWithTvName?.content_ratings?.results.map((rating) => ({
          country: rating.iso_3166_1,
          value: rating.rating,
        }))
      : detailWithTvName?.release_dates?.results.flatMap((country) =>
          country.release_dates.map((release) => ({
            country: country.iso_3166_1,
            value: release.certification,
          }))
        );
  const ageRating =
    certifications?.find((rating) => rating.country === "IN" && rating.value)
      ?.value ??
    certifications?.find((rating) => rating.country === "US" && rating.value)
      ?.value ??
    certifications?.find((rating) => rating.value)?.value ??
    (detailWithTvName?.adult ? "18+" : "NR");
  const detailTypography = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: { xs: 12, sm: 13 },
    fontWeight: 400,
    lineHeight: 1.5,
  };
  const matchingVideos = similarVideos?.results.filter((item) =>
    item.genre_ids?.some((id) =>
      detail.mediaDetail?.genres.some((genre) => genre.id === id)
    )
  );
  const moreLikeVideos = detail.mediaDetail?.genres.length
    ? matchingVideos
    : similarVideos?.results;

  useEffect(() => {
    setIsSaved(false);
    setIsLiked(false);
  }, [detail.id]);

  const updateCastArrows = useCallback(() => {
    const row = castRef.current;
    if (!row) return;
    setCastAtStart(row.scrollLeft <= 0);
    setCastAtEnd(row.scrollLeft + row.clientWidth >= row.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateCastArrows();
  }, [detail.mediaDetail?.credits?.cast.length, updateCastArrows]);

  const scrollCast = (direction: -1 | 1) => {
    castRef.current?.scrollBy({
      left: direction * (castRef.current.clientWidth * 0.75),
      behavior: "smooth",
    });
  };

  const handleReady = useCallback((player: Player) => {
    playerRef.current = player;
    setMuted(player.muted());
  }, []);

  const handleMute = useCallback((status: boolean) => {
    if (playerRef.current) {
      playerRef.current.muted(!status);
      setMuted(!status);
    }
  }, []);

  if (detail.id && !detail.mediaDetail) {
    return (
      <Dialog
        open
        maxWidth="sm"
        fullWidth
        onClose={() => setDetailType({})}
      >
        <DialogContent sx={{ p: 5, bgcolor: "#181818", color: "white" }}>
          <Stack alignItems="center" spacing={2}>
            {detail.loading && <CircularProgress color="inherit" />}
            <Typography>
              {detail.error ? "Could not load this title." : "Loading details…"}
            </Typography>
            <IconButton
              aria-label="Close details"
              onClick={() => setDetailType({})}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  if (detail.mediaDetail) {
    return (
      <Dialog
        fullWidth
        scroll="body"
        maxWidth="md"
        open={!!detail.mediaDetail}
        id="detail_dialog"
        TransitionComponent={Transition}
      >
        <DialogContent sx={{ p: 0, bgcolor: "#181818" }}>
          <Box
            sx={{
              top: 0,
              left: 0,
              right: 0,
              position: "relative",
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: "100%",
                position: "relative",
                height: "calc(9 / 16 * 100%)",
              }}
            >
              {trailer && (
                <VideoJSPlayer
                  key={`${detail.id}-${trailer.key}`}
                  options={{
                    loop: true,
                    autoplay: true,
                    controls: false,
                    responsive: true,
                    fluid: true,
                    techOrder: ["youtube"],
                    sources: [
                      {
                        type: "video/youtube",
                        src: `https://www.youtube.com/watch?v=${trailer.key}`,
                      },
                    ],
                  }}
                  onReady={handleReady}
                />
              )}

              <Box
                sx={{
                  background: `linear-gradient(77deg,rgba(0,0,0,.6),transparent 85%)`,
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: "26.09%",
                  opacity: 1,
                  position: "absolute",
                  transition: "opacity .5s",
                }}
              />
              <Box
                sx={{
                  backgroundColor: "transparent",
                  backgroundImage:
                    "linear-gradient(180deg,hsla(0,0%,8%,0) 0,hsla(0,0%,8%,.15) 15%,hsla(0,0%,8%,.35) 29%,hsla(0,0%,8%,.58) 44%,#141414 68%,#141414)",
                  backgroundRepeat: "repeat-x",
                  backgroundPosition: "0px top",
                  backgroundSize: "100% 100%",
                  bottom: 0,
                  position: "absolute",
                  height: "14.7vw",
                  opacity: 1,
                  top: "auto",
                  width: "100%",
                }}
              />
              <IconButton
                onClick={() => {
                  setDetailType({ mediaType: undefined, id: undefined });
                }}
                sx={{
                  top: 15,
                  right: 15,
                  position: "absolute",
                  bgcolor: "#181818",
                  width: { xs: 22, sm: 40 },
                  height: { xs: 22, sm: 40 },
                  "&:hover": {
                    bgcolor: "primary.main",
                  },
                }}
              >
                <CloseIcon
                  sx={{ color: "white", fontSize: { xs: 14, sm: 22 } }}
                />
              </IconButton>
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 16,
                  px: { xs: 2, sm: 3, md: 5 },
                }}
              >
                <MaxLineTypography variant="h4" maxLine={1} sx={{ mb: 2 }}>
                  {title}
                </MaxLineTypography>
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <PlayButton
                    sx={{
                      color: "#111",
                      bgcolor: "#fff",
                      py: 0,
                      "&:hover": { bgcolor: "#e6e6e6" },
                    }}
                    mediaType={detail.mediaType ?? MEDIA_TYPE.Movie}
                    videoId={detail.id}
                  />
                  <NetflixIconButton
                    aria-label={isSaved ? "Remove from My List" : "Add to My List"}
                    aria-pressed={isSaved}
                    onClick={() => setIsSaved((saved) => !saved)}
                    sx={{
                      borderRadius: "50%",
                      bgcolor: isSaved ? "#fff" : "rgba(20,20,20,.65)",
                      color: isSaved ? "#111" : "#fff",
                    }}
                  >
                    {isSaved ? <CheckIcon /> : <AddIcon />}
                  </NetflixIconButton>
                  <NetflixIconButton
                    aria-label={isLiked ? "Unlike this title" : "Like this title"}
                    aria-pressed={isLiked}
                    onClick={() => setIsLiked((liked) => !liked)}
                    sx={{
                      borderRadius: "50%",
                      bgcolor: isLiked ? "#fff" : "rgba(20,20,20,.65)",
                      color: isLiked ? "#111" : "#fff",
                    }}
                  >
                    {isLiked ? <ThumbUpIcon /> : <ThumbUpOffAltIcon />}
                  </NetflixIconButton>
                  <Box flexGrow={1} />
                  <NetflixIconButton
                    size="large"
                    onClick={() => handleMute(muted)}
                    sx={{ zIndex: 2 }}
                  >
                    {!muted ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </NetflixIconButton>
                </Stack>

                <Container
                  sx={{
                    p: "0px !important",
                  }}
                >
                  <Grid container spacing={5} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        flexWrap="wrap"
                        sx={{ rowGap: 0.75, ...detailTypography }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "success.main", ...detailTypography }}
                        >{`TMDB ${detail.mediaDetail.vote_average.toFixed(1)}/10`}</Typography>
                        <Typography variant="body2" sx={detailTypography}>
                          {releaseDate?.substring(0, 4)}
                        </Typography>
                        <AgeLimitChip label={ageRating} sx={detailTypography} />
                        {!!duration && (
                          <Typography variant="body2" sx={detailTypography}>
                            {formatMinuteToReadable(duration)}
                          </Typography>
                        )}
                        <QualityChip label="HD" />
                      </Stack>

                      <MaxLineTypography
                        maxLine={3}
                        variant="body1"
                        sx={{ mt: 2, ...detailTypography, fontSize: { xs: 13, sm: 14 } }}
                      >
                        {detail.mediaDetail?.overview}
                      </MaxLineTypography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" sx={{ my: 1, ...detailTypography }}>
                        {`Genres : ${detail.mediaDetail?.genres
                          .map((g) => g.name)
                          .join(", ")}`}
                      </Typography>
                      <Typography variant="body2" sx={{ my: 1, ...detailTypography }}>
                        {`Audio languages: ${detail.mediaDetail?.spoken_languages
                          .map((language) => language.english_name || language.name)
                          .join(", ") || "Not listed"}`}
                      </Typography>
                    </Grid>
                  </Grid>
                </Container>
              </Box>
            </Box>
            {!!detail.mediaDetail.credits?.cast.length && (
              <Container sx={{ py: 2, px: { xs: 2, sm: 3, md: 5 } }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">Cast</Typography>
                  <Stack direction="row" spacing={1}>
                    <NetflixIconButton
                      size="small"
                      aria-label="Scroll cast left"
                      disabled={castAtStart}
                      onClick={() => scrollCast(-1)}
                    >
                      <ArrowBackIosNewIcon fontSize="small" />
                    </NetflixIconButton>
                    <NetflixIconButton
                      size="small"
                      aria-label="Scroll cast right"
                      disabled={castAtEnd}
                      onClick={() => scrollCast(1)}
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </NetflixIconButton>
                  </Stack>
                </Stack>
                <Stack
                  ref={castRef}
                  direction="row"
                  spacing={2}
                  onScroll={updateCastArrows}
                  sx={{
                    overflowX: "auto",
                    pb: 1,
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                  }}
                >
                  {detail.mediaDetail.credits.cast.slice(0, 12).map((person) => (
                    <Box
                      key={person.id}
                      sx={{ minWidth: 92, maxWidth: 92, textAlign: "center" }}
                    >
                      <Avatar
                        src={
                          person.profile_path && configuration?.images.base_url
                            ? `${configuration.images.base_url}w185${person.profile_path}`
                            : undefined
                        }
                        alt={person.name}
                        sx={{ width: 64, height: 64, mx: "auto", mb: 1 }}
                      >
                        {person.name.charAt(0)}
                      </Avatar>
                      <Typography
                        component="a"
                        href={`https://www.google.com/search?q=${encodeURIComponent(person.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        display="block"
                        sx={{
                          color: "inherit",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {person.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {person.character}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Container>
            )}
            {moreLikeVideos && moreLikeVideos.length > 0 && (
              <Container
                sx={{
                  py: 2,
                  px: { xs: 2, sm: 3, md: 5 },
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  More Like This
                </Typography>
                <Grid container spacing={2}>
                  {moreLikeVideos.map((sm) => (
                    <Grid item xs={6} sm={4} key={sm.id}>
                      <SimilarVideoCard
                        video={sm}
                        mediaType={detail.mediaType ?? MEDIA_TYPE.Movie}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Container>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

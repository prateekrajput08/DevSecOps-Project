import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import Player from "video.js/dist/types/player";

import { getRandomNumber } from "src/utils/common";
import MaxLineTypography from "./MaxLineTypography";
import PlayButton from "./PlayButton";
import MoreInfoButton from "./MoreInfoButton";
import NetflixIconButton from "./NetflixIconButton";
import MaturityRate from "./MaturityRate";
import useIntersectionObserver from "src/hooks/useIntersectionObserver";
import { useDetailModal } from "src/providers/DetailModalProvider";
import { MEDIA_TYPE } from "src/types/Common";
import {
  useGetVideosByMediaTypeAndCustomGenreQuery,
  useLazyGetAppendedVideosQuery,
} from "src/store/slices/discover";
import { MovieDetail } from "src/types/Movie";
import VideoJSPlayer from "./watch/VideoJSPlayer";
import { motion } from "framer-motion";

interface TopTrailerProps {
  mediaType: MEDIA_TYPE;
}

type HeroDetail = MovieDetail & {
  name?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
  content_ratings?: {
    results: { iso_3166_1: string; rating: string }[];
  };
};

export default function TopTrailer({ mediaType }: TopTrailerProps) {
  const { data } = useGetVideosByMediaTypeAndCustomGenreQuery({
    mediaType,
    apiString: "popular",
    page: 1,
  });
  const [getVideoDetail, { data: detail }] = useLazyGetAppendedVideosQuery();
  const [videoIndex, setVideoIndex] = useState(-1);
  const [muted, setMuted] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const playerRef = useRef<Player | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroIntersection = useIntersectionObserver(heroRef, { threshold: 0.1 });
  const { detail: openedDetail, setDetailType } = useDetailModal();
  const videos = useMemo(
    () => data?.results.filter((item) => !!item.backdrop_path) ?? [],
    [data]
  );
  const video = videos[videoIndex] ?? null;
  const heroDetail =
    video && detail?.id === video.id ? (detail as HeroDetail) : undefined;
  const trailerVideos = heroDetail?.videos.results.filter(
    (item) =>
      item.site === "YouTube" &&
      ["en", "hi"].includes(item.iso_639_1) &&
      ["Trailer", "Teaser"].includes(item.type)
  );
  const preferredTrailerLanguage =
    heroDetail?.original_language === "hi" ? "hi" : "en";
  const trailer =
    trailerVideos?.find(
      (item) =>
        item.iso_639_1 === preferredTrailerLanguage &&
        item.type === "Trailer" &&
        item.official
    ) ??
    trailerVideos?.find(
      (item) =>
        item.iso_639_1 === preferredTrailerLanguage && item.type === "Trailer"
    ) ??
    trailerVideos?.find(
      (item) =>
        item.iso_639_1 === preferredTrailerLanguage && item.type === "Teaser"
    ) ??
    trailerVideos?.find((item) => item.type === "Trailer" && item.official) ??
    trailerVideos?.find((item) => item.type === "Trailer") ??
    trailerVideos?.find((item) => item.type === "Teaser");
  const title =
    heroDetail?.title ?? heroDetail?.name ?? video?.title ?? video?.original_title;
  const certifications =
    mediaType === MEDIA_TYPE.Movie
      ? heroDetail?.release_dates?.results.flatMap((country) =>
          country.release_dates.map((release) => ({
            country: country.iso_3166_1,
            value: release.certification,
          }))
        )
      : heroDetail?.content_ratings?.results.map((rating) => ({
          country: rating.iso_3166_1,
          value: rating.rating,
        }));
  const ageRating =
    certifications?.find((rating) => rating.country === "IN" && rating.value)
      ?.value ??
    certifications?.find((rating) => rating.country === "US" && rating.value)
      ?.value ??
    certifications?.find((rating) => rating.value)?.value ??
    (heroDetail?.adult ? "18+" : "NR");
  const languages = heroDetail?.spoken_languages
    .map((language) => language.english_name || language.name)
    .filter(Boolean);

  useEffect(() => {
    let hideTimer: number;
    const revealDetails = () => {
      setShowDetails(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setShowDetails(false), 5000);
    };
    revealDetails();
    window.addEventListener("pointermove", revealDetails);
    window.addEventListener("keydown", revealDetails);
    window.addEventListener("touchstart", revealDetails);
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener("pointermove", revealDetails);
      window.removeEventListener("keydown", revealDetails);
      window.removeEventListener("touchstart", revealDetails);
    };
  }, []);

  const handleReady = useCallback((player: Player) => {
    playerRef.current = player;
    if (heroIntersection?.isIntersecting && !openedDetail.id) player.play();
    else player.pause();
  }, [heroIntersection?.isIntersecting, openedDetail.id]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (heroIntersection?.isIntersecting && !openedDetail.id) {
      if (player.paused()) player.play();
    } else {
      player.pause();
    }
  }, [heroIntersection?.isIntersecting, openedDetail.id]);

  useEffect(() => {
    if (videos.length) setVideoIndex(getRandomNumber(videos.length));
  }, [videos]);

  useEffect(() => {
    if (video) {
      getVideoDetail({ mediaType, id: video.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

  const handleTrailerEnded = useCallback(() => {
    setVideoIndex((index) => (index + 1) % videos.length);
  }, [videos.length]);

  const handleMute = useCallback((status: boolean) => {
    if (playerRef.current) {
      playerRef.current.muted(!status);
      setMuted(!status);
    }
  }, []);

  return (
    <Box ref={heroRef} sx={{ position: "relative", zIndex: 1 }}>
      <Box
        sx={{
          mb: 3,
          pb: "56.25%",
          top: 0,
          left: 0,
          right: 0,
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "56.25vw",
            position: "absolute",
          }}
        >
          {video && (
            <>
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  position: "absolute",
                }}
              >
                {heroDetail && trailer && (
                  <VideoJSPlayer
                    key={video.id}
                    options={{
                      loop: false,
                      muted: true,
                      autoplay: false,
                      controls: false,
                      responsive: true,
                      fluid: true,
                      techOrder: ["youtube"],
                      sources: [
                        {
                          type: "video/youtube",
                          src: `https://www.youtube.com/watch?v=${
                            trailer.key
                          }`,
                        },
                      ],
                    }}
                    onReady={(player) => {
                      handleReady(player);
                      player.one("ended", handleTrailerEnded);
                    }}
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
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                    position: "absolute",
                    right: 0,
                    bottom: "35%",
                  }}
                >
                  <NetflixIconButton
                    size="large"
                    onClick={() => handleMute(muted)}
                    sx={{ zIndex: 2 }}
                  >
                    {!muted ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </NetflixIconButton>
                  <MaturityRate>{ageRating}</MaturityRate>
                </Stack>
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <Stack
                  spacing={{ xs: 2, md: 3 }}
                  component={motion.div}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{
                    opacity: showDetails ? 1 : 0,
                    y: showDetails ? 0 : 8,
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  sx={{
                    bottom: { xs: "24%", md: "20%" },
                    position: "absolute",
                    left: { xs: "4%", md: "60px" },
                    width: { xs: "88%", sm: "60%", md: "42%", lg: "36%" },
                    maxWidth: 620,
                    zIndex: 10,
                    justifyContent: "flex-end",
                    pointerEvents: showDetails ? "auto" : "none",
                    transition: "opacity .35s ease",
                  }}
                >
                  <MaxLineTypography
                    variant="h2"
                    maxLine={1}
                    color="text.primary"
                    sx={{
                      fontSize: "clamp(1.8rem, 3.2vw, 3.4rem)",
                      fontWeight: 600,
                    }}
                  >
                    {title}
                  </MaxLineTypography>
                  <MaxLineTypography
                    variant="h5"
                    maxLine={3}
                    color="text.primary"
                    sx={{
                      fontSize: "clamp(.9rem, 1.15vw, 1.15rem)",
                      fontWeight: 400,
                      lineHeight: 1.45,
                    }}
                  >
                    {heroDetail?.overview ?? video.overview}
                  </MaxLineTypography>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      color: "rgba(255,255,255,.9)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 14,
                      flexWrap: "wrap",
                      rowGap: 0.5,
                    }}
                  >
                    <span>Audio: {languages?.join(", ") || "Not listed"}</span>
                    <span>Age: {ageRating}</span>
                    {!!heroDetail?.vote_average && (
                      <span>TMDB ★ {heroDetail.vote_average.toFixed(1)}/10</span>
                    )}
                    <span>
                      {heroDetail?.spoken_languages?.length
                        ? `Original: ${heroDetail.original_language.toUpperCase()}`
                        : ""}
                    </span>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={{ xs: 1, sm: 2 }}
                    sx={{ flexWrap: "wrap" }}
                  >
                    <PlayButton
                      size="large"
                      mediaType={mediaType}
                      videoId={video.id}
                      sx={{
                        bgcolor: "#fff",
                        color: "#111",
                        "&:hover": { bgcolor: "#e6e6e6" },
                      }}
                    />
                    <MoreInfoButton
                      size="large"
                      onClick={() => {
                        setDetailType({ mediaType, id: video.id });
                      }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

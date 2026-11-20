import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Slide from "@mui/material/Slide";
import CloseIcon from "@mui/icons-material/esm/Close.js";
import CheckIcon from "@mui/icons-material/esm/Check.js";
import ArrowBackIosNewIcon from "@mui/icons-material/esm/ArrowBackIosNew.js";
import ArrowForwardIosIcon from "@mui/icons-material/esm/ArrowForwardIos.js";
import AddIcon from "@mui/icons-material/esm/Add.js";
import ThumbUpOffAltIcon from "@mui/icons-material/esm/ThumbUpOffAlt.js";
import ThumbUpIcon from "@mui/icons-material/esm/ThumbUp.js";
import VolumeUpIcon from "@mui/icons-material/esm/VolumeUp.js";
import VolumeOffIcon from "@mui/icons-material/esm/VolumeOff.js";
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
const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props}/>;
});
export default function DetailModal() {
    const { detail, setDetailType } = useDetailModal();
    const { data: similarVideos } = useGetSimilarVideosQuery({ mediaType: detail.mediaType ?? MEDIA_TYPE.Movie, id: detail.id ?? 0 }, { skip: !detail.id });
    const playerRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [showMobileExtras, setShowMobileExtras] = useState(false);
    const castRef = useRef(null);
    const [castAtStart, setCastAtStart] = useState(true);
    const [castAtEnd, setCastAtEnd] = useState(false);
    const { data: configuration } = useGetConfigurationQuery(undefined);
    const detailWithTvName = detail.mediaDetail;
    const title = detailWithTvName?.title ?? detailWithTvName?.name;
    const releaseDate = detailWithTvName?.release_date ?? detailWithTvName?.first_air_date;
    const duration = detailWithTvName?.runtime ?? detailWithTvName?.episode_run_time?.[0] ?? 0;
    const availableTrailers = detail.mediaDetail?.videos.results.filter((video) => video.site === "YouTube");
    const preferredTrailerLanguage = detailWithTvName?.original_language === "hi" ? "hi" : "en";
    const trailer = availableTrailers?.find((video) => video.iso_639_1 === preferredTrailerLanguage &&
        video.type === "Trailer" &&
        video.official) ??
        availableTrailers?.find((video) => video.iso_639_1 === preferredTrailerLanguage && video.type === "Trailer") ??
        availableTrailers?.find((video) => video.iso_639_1 === preferredTrailerLanguage && video.type === "Teaser") ??
        availableTrailers?.find((video) => video.type === "Trailer" && video.official) ??
        availableTrailers?.find((video) => video.type === "Trailer") ??
        availableTrailers?.find((video) => video.type === "Teaser") ??
        availableTrailers?.[0];
    const certifications = detail.mediaType === MEDIA_TYPE.Tv
        ? detailWithTvName?.content_ratings?.results.map((rating) => ({
            country: rating.iso_3166_1,
            value: rating.rating,
        }))
        : detailWithTvName?.release_dates?.results.flatMap((country) => country.release_dates.map((release) => ({
            country: country.iso_3166_1,
            value: release.certification,
        })));
    const ageRating = certifications?.find((rating) => rating.country === "IN" && rating.value)
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
    const matchingVideos = similarVideos?.results.filter((item) => item.genre_ids?.some((id) => detail.mediaDetail?.genres.some((genre) => genre.id === id)));
    const moreLikeVideos = detail.mediaDetail?.genres.length
        ? matchingVideos
        : similarVideos?.results;
    useEffect(() => {
        setIsSaved(false);
        setIsLiked(false);
        setShowMobileExtras(false);
    }, [detail.id]);
    const updateCastArrows = useCallback(() => {
        const row = castRef.current;
        if (!row)
            return;
        setCastAtStart(row.scrollLeft <= 0);
        setCastAtEnd(row.scrollLeft + row.clientWidth >= row.scrollWidth - 1);
    }, []);
    useEffect(() => {
        updateCastArrows();
        window.addEventListener("resize", updateCastArrows);
        return () => window.removeEventListener("resize", updateCastArrows);
    }, [detail.mediaDetail?.credits?.cast.length, updateCastArrows]);
    const scrollCast = (direction) => {
        castRef.current?.scrollBy({
            left: direction * (castRef.current.clientWidth * 0.75),
            behavior: "smooth",
        });
    };
    const handleReady = useCallback((player) => {
        playerRef.current = player;
        setMuted(player.muted());
    }, []);
    const handleMute = useCallback((status) => {
        if (playerRef.current) {
            playerRef.current.muted(!status);
            setMuted(!status);
        }
    }, []);
    if (detail.id && !detail.mediaDetail) {
        return (<Dialog open maxWidth="sm" fullWidth onClose={() => setDetailType({})}>
        <DialogContent sx={{ p: 5, bgcolor: "#181818", color: "white" }}>
          <Stack alignItems="center" spacing={2}>
            {detail.loading && <CircularProgress color="inherit"/>}
            <Typography>
              {detail.error ? "Could not load this title." : `Loading ${detail.title || "title"}…`}
            </Typography>
            <IconButton aria-label="Close details" onClick={() => setDetailType({})}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogContent>
      </Dialog>);
    }
    if (detail.mediaDetail) {
        return (<Dialog fullWidth scroll="paper" maxWidth={false} sx={{
                "& .NetflixDialog-paper": {
                    m: { xs: "1vw", sm: 2 },
                    width: { xs: "98vw", sm: "calc(100% - 64px)" },
                    maxWidth: 760,
                    maxHeight: { xs: "98vh", sm: "calc(100% - 64px)" },
                    borderRadius: 2,
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                },
            }} open={!!detail.mediaDetail} id="detail_dialog" TransitionComponent={Transition}>
        <DialogContent sx={{ p: 0, bgcolor: "#181818", overflowX: "hidden", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
              <Box sx={{
                top: 0,
                left: 0,
                right: 0,
                position: "relative",
                mb: 3,
            }}>
            <Box sx={{
                width: "100%",
                position: "relative",
                aspectRatio: "16 / 9",
                overflow: "hidden",
            }}>
              {trailer && (<VideoJSPlayer key={`${detail.id}-${trailer.key}`} options={{
                    loop: true,
                    autoplay: true,
                    controls: false,
                    responsive: true,
                    fluid: true,
                    techOrder: ["youtube"],
                    youtube: { ytControls: 0, playsinline: 1 },
                    width: "100%",
                    sources: [
                        {
                            type: "video/youtube",
                            src: `https://www.youtube.com/watch?v=${trailer.key}`,
                        },
                    ],
                }} onReady={handleReady}/>)}

              <IconButton onClick={() => {
                setDetailType({ mediaType: undefined, id: undefined });
            }} sx={{
                top: 15,
                right: 15,
                position: "absolute",
                bgcolor: "#181818",
                width: { xs: 22, sm: 40 },
                height: { xs: 22, sm: 40 },
                "&:hover": {
                    bgcolor: "primary.main",
                },
            }}>
                <CloseIcon sx={{ color: "white", fontSize: { xs: 14, sm: 22 } }}/>
              </IconButton>
            </Box>
              <Box sx={{
                position: "relative",
                px: { xs: 1.5, sm: 3, md: 5 },
                pt: { xs: 1.5, sm: 3 },
                pb: 2,
                bgcolor: "#181818",
            }}>
                <MaxLineTypography variant="h4" maxLine={1} sx={{ fontSize: { xs: 20, sm: 34 }, mb: { xs: 0.5, sm: 2 } }}>
                  {title}
                </MaxLineTypography>
                <Stack direction="row" spacing={1.25} sx={{ mb: { xs: 1, sm: 3 } }}>
                  <PlayButton sx={{
                color: "#111",
                bgcolor: "#fff",
                px: { xs: 1, sm: 2 },
                py: { xs: 0.35, sm: 0 },
                minHeight: { xs: 32, sm: 36 },
                fontSize: { xs: 12, sm: 14 },
                "& .MuiButton-startIcon svg": { fontSize: { xs: 16, sm: 21 } },
                "&:hover": { bgcolor: "#e6e6e6" },
            }} mediaType={detail.mediaType ?? MEDIA_TYPE.Movie} videoId={detail.id}/>
                  <NetflixIconButton size="small" aria-label={isSaved ? "Remove from My List" : "Add to My List"} aria-pressed={isSaved} onClick={() => setIsSaved((saved) => !saved)} sx={{
                width: { xs: 32, sm: 38 },
                height: { xs: 32, sm: 38 },
                p: 0,
                borderRadius: "50%",
                bgcolor: isSaved ? "#fff" : "rgba(20,20,20,.65)",
                color: isSaved ? "#111" : "#fff",
            }}>
                    {isSaved ? <CheckIcon /> : <AddIcon />}
                  </NetflixIconButton>
                  <NetflixIconButton size="small" aria-label={isLiked ? "Unlike this title" : "Like this title"} aria-pressed={isLiked} onClick={() => setIsLiked((liked) => !liked)} sx={{
                width: { xs: 32, sm: 38 },
                height: { xs: 32, sm: 38 },
                p: 0,
                borderRadius: "50%",
                bgcolor: isLiked ? "#fff" : "rgba(20,20,20,.65)",
                color: isLiked ? "#111" : "#fff",
            }}>
                    {isLiked ? <ThumbUpIcon /> : <ThumbUpOffAltIcon />}
                  </NetflixIconButton>
                  <Box flexGrow={1}/>
                  <NetflixIconButton size="small" aria-label={muted ? "Unmute trailer" : "Mute trailer"} onClick={() => handleMute(muted)} sx={{ zIndex: 2, width: { xs: 32, sm: 38 }, height: { xs: 32, sm: 38 }, p: 0, borderRadius: "50%" }}>
                    {!muted ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </NetflixIconButton>
                </Stack>

                <Container sx={{
                p: "0px !important",
            }}>
                  <Grid container spacing={{ xs: 0.5, sm: 3 }} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                      <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.75, ...detailTypography }}>
                        <Typography variant="body2" sx={{ color: "success.main", ...detailTypography }}>{`TMDB rating: ${detail.mediaDetail.vote_average.toFixed(1)}/10`}</Typography>
                        <Typography variant="body2" sx={detailTypography}>
                          {releaseDate?.substring(0, 4)}
                        </Typography>
                        <AgeLimitChip label={ageRating} sx={detailTypography}/>
                        {!!duration && (<Typography variant="body2" sx={detailTypography}>
                            {formatMinuteToReadable(duration)}
                          </Typography>)}
                        <QualityChip label="HD"/>
                      </Stack>

                      <MaxLineTypography maxLine={2} variant="body1" sx={{ mt: 2, ...detailTypography, fontSize: { xs: 13, sm: 14 } }}>
                        {detail.mediaDetail?.overview}
                      </MaxLineTypography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" sx={{ my: { xs: 0.5, sm: 1 }, ...detailTypography, overflowWrap: "anywhere" }}>
                        {`Genres : ${detail.mediaDetail?.genres
                .map((g) => g.name)
                .join(", ")}`}
                      </Typography>
                      <Typography variant="body2" sx={{ my: { xs: 0.5, sm: 1 }, ...detailTypography, overflowWrap: "anywhere" }}>
                        {`Audio languages: ${detail.mediaDetail?.spoken_languages
                .map((language) => language.english_name || language.name)
                .join(", ") || "Not listed"}`}
                      </Typography>
                    </Grid>
                  </Grid>
                </Container>
              </Box>
            <Button variant="outlined" aria-expanded={showMobileExtras} onClick={() => setShowMobileExtras((shown) => !shown)} sx={{
                display: { xs: "inline-flex", sm: "none" },
                mx: 2,
                mb: 1,
                borderRadius: 2,
                color: "white",
                borderColor: "grey.700",
                textTransform: "none",
            }}>
              {showMobileExtras ? "Hide cast & more like this" : "Show cast & more like this"}
            </Button>
            <Box sx={{ display: { xs: showMobileExtras ? "block" : "none", sm: "block" } }}>
            {!!detail.mediaDetail.credits?.cast.length ? (<Container sx={{ py: 2, px: { xs: 2, sm: 3, md: 5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6">Cast</Typography>
                  <Stack direction="row" spacing={1}>
                    <NetflixIconButton size="small" aria-label="Scroll cast left" disabled={castAtStart} onClick={() => scrollCast(-1)}>
                      <ArrowBackIosNewIcon fontSize="small"/>
                    </NetflixIconButton>
                    <NetflixIconButton size="small" aria-label="Scroll cast right" disabled={castAtEnd} onClick={() => scrollCast(1)}>
                      <ArrowForwardIosIcon fontSize="small"/>
                    </NetflixIconButton>
                  </Stack>
                </Stack>
                <Stack ref={castRef} direction="row" spacing={{ xs: 1, sm: 2 }} onScroll={updateCastArrows} sx={{
                    overflowX: "auto",
                    pb: 1,
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                }}>
                  {[...detail.mediaDetail.credits.cast]
                    .filter((person) => !!person.name)
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 12)
                    .map((person) => (<Box key={person.id} sx={{ minWidth: { xs: 72, sm: 92 }, maxWidth: { xs: 72, sm: 92 }, textAlign: "center" }}>
                      <Avatar src={person.profile_path && configuration?.images.base_url
                        ? `${configuration.images.base_url}w185${person.profile_path}`
                        : undefined} alt={person.name} sx={{ width: { xs: 48, sm: 64 }, height: { xs: 48, sm: 64 }, mx: "auto", mb: 1 }}>
                        {person.name.charAt(0)}
                      </Avatar>
                      <Typography component="a" href={`https://www.google.com/search?q=${encodeURIComponent(person.name)}`} target="_blank" rel="noopener noreferrer" variant="caption" display="block" sx={{
                        color: "inherit",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                    }}>
                        {person.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {person.character}
                      </Typography>
                    </Box>))}
                </Stack>
              </Container>) : (<Container sx={{ py: 2, px: { xs: 2, sm: 3, md: 5 } }}>
                <Typography variant="h6">Cast information unavailable</Typography>
              </Container>)}
            {moreLikeVideos && moreLikeVideos.length > 0 && (<Container sx={{
                    py: 2,
                    px: { xs: 2, sm: 3, md: 5 },
                }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  More Like This
                </Typography>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
                  {moreLikeVideos.map((sm) => (<Grid item xs={6} sm={4} key={sm.id}>
                      <SimilarVideoCard video={sm} mediaType={detail.mediaType ?? MEDIA_TYPE.Movie}/>
                    </Grid>))}
                </Grid>
              </Container>)}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>);
    }
    return null;
}

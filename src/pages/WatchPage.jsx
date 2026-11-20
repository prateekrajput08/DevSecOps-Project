import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Menu, MenuItem, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/esm/PlayArrow.js";
import PauseIcon from "@mui/icons-material/esm/Pause.js";
import FullscreenIcon from "@mui/icons-material/esm/Fullscreen.js";
import FullscreenExitIcon from "@mui/icons-material/esm/FullscreenExit.js";
import SettingsIcon from "@mui/icons-material/esm/Settings.js";
import KeyboardBackspaceIcon from "@mui/icons-material/esm/KeyboardBackspace.js";
import ClosedCaptionIcon from "@mui/icons-material/esm/ClosedCaption.js";
import LanguageIcon from "@mui/icons-material/esm/Language.js";
import ReplayIcon from "@mui/icons-material/esm/Replay.js";
import useWindowSize from "src/hooks/useWindowSize";
import { formatTime } from "src/utils/common";
import VolumeControllers from "src/components/watch/VolumeControllers";
import VideoJSPlayer from "src/components/watch/VideoJSPlayer";
import PlayerSeekbar from "src/components/watch/PlayerSeekbar";
import PlayerControlButton from "src/components/watch/PlayerControlButton";
import { useGetAppendedVideosQuery } from "src/store/slices/discover";
import { MEDIA_TYPE } from "src/types/Common";
const playbackQualities = [
    ["hd1080", "1080p"],
    ["hd720", "720p"],
    ["large", "480p"],
    ["medium", "360p"],
    ["small", "240p"],
    ["default", "Auto quality"],
];
export function Component() {
    const playerRef = useRef(null);
    const playerContainerRef = useRef(null);
    const controlsTimerRef = useRef();
    const [playerState, setPlayerState] = useState({
        paused: false,
        muted: false,
        playedSeconds: 0,
        duration: 0,
        volume: 0.8,
        loaded: 0,
    });
    const navigate = useNavigate();
    const [playerInitialized, setPlayerInitialized] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [trailerEnded, setTrailerEnded] = useState(false);
    const [settingsAnchor, setSettingsAnchor] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [playbackQuality, setPlaybackQuality] = useState("hd1080");
    const [trailerLanguage, setTrailerLanguage] = useState("auto");
    const [captionLanguage, setCaptionLanguage] = useState("en");
    const [captionsEnabled, setCaptionsEnabled] = useState(false);
    const [languageAnchor, setLanguageAnchor] = useState(null);
    const [searchParams] = useSearchParams();
    const parsedId = Number(searchParams.get("id"));
    const videoId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined;
    const mediaType = searchParams.get("mediaType") === MEDIA_TYPE.Tv
        ? MEDIA_TYPE.Tv
        : MEDIA_TYPE.Movie;
    const { data: mediaDetail, isFetching, isError, } = useGetAppendedVideosQuery({ mediaType, id: videoId ?? 0 }, { skip: !videoId });
    const trailerVideos = mediaDetail?.videos.results.filter((video) => video.site === "YouTube");
    const detailWithSeriesName = mediaDetail;
    const title = detailWithSeriesName?.title ?? detailWithSeriesName?.name;
    const requestedTrailerLanguage = trailerLanguage === "auto"
        ? mediaDetail?.original_language === "hi"
            ? "hi"
            : "en"
        : trailerLanguage;
    const trailer = trailerVideos?.find((video) => video.iso_639_1 === requestedTrailerLanguage &&
        video.type === "Trailer" &&
        video.official) ??
        trailerVideos?.find((video) => video.iso_639_1 === requestedTrailerLanguage && video.type === "Trailer") ??
        trailerVideos?.find((video) => video.iso_639_1 === requestedTrailerLanguage && video.type === "Teaser") ??
        trailerVideos?.find((video) => video.type === "Trailer" && video.official) ??
        trailerVideos?.find((video) => video.type === "Trailer") ??
        trailerVideos?.find((video) => video.type === "Teaser") ??
        trailerVideos?.[0];
    const availableTrailerLanguages = Array.from(new Set(trailerVideos?.map((video) => video.iso_639_1) ?? []));
    const revealControls = useCallback(() => {
        setControlsVisible(true);
        window.clearTimeout(controlsTimerRef.current);
        if (trailerEnded)
            return;
        controlsTimerRef.current = window.setTimeout(() => {
            setControlsVisible(false);
            setSettingsAnchor(null);
        }, 3000);
    }, [trailerEnded]);
    useEffect(() => {
        setPlayerInitialized(false);
        playerRef.current = null;
        setPlayerState({
            paused: false,
            muted: false,
            playedSeconds: 0,
            duration: 0,
            volume: 0.8,
            loaded: 0,
        });
        setPlaybackRate(1);
        setTrailerEnded(false);
        setTrailerLanguage("auto");
    }, [videoId, mediaType]);
    useEffect(() => {
        setPlayerInitialized(false);
        playerRef.current = null;
        setPlayerState((draft) => ({
            ...draft,
            paused: false,
            playedSeconds: 0,
            duration: 0,
        }));
        setTrailerEnded(false);
    }, [trailer?.key, captionsEnabled, captionLanguage]);
    useEffect(() => {
        if (playerInitialized)
            revealControls();
        return () => window.clearTimeout(controlsTimerRef.current);
    }, [playerInitialized, revealControls]);
    useEffect(() => {
        const updateFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", updateFullscreen);
        return () => document.removeEventListener("fullscreenchange", updateFullscreen);
    }, []);
    const windowSize = useWindowSize();
    const videoJsOptions = useMemo(() => {
        return {
            preload: "metadata",
            autoplay: true,
            controls: false,
            // responsive: true,
            // fluid: true,
            width: windowSize.width,
            height: windowSize.height,
            techOrder: ["youtube"],
            youtube: {
                rel: 0,
                iv_load_policy: 3,
                playsinline: 1,
                ytControls: 0,
                cc_load_policy: captionsEnabled ? 1 : 0,
                cc_lang_pref: captionLanguage,
            },
            sources: trailer
                ? [
                    {
                        src: `https://www.youtube.com/watch?v=${trailer.key}`,
                        type: "video/youtube",
                    },
                ]
                : [],
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize, trailer, captionsEnabled, captionLanguage]);
    const handlePlayerReady = function (player) {
        player.on("pause", () => {
            setPlayerState((draft) => {
                return { ...draft, paused: true };
            });
        });
        player.on("play", () => {
            setPlayerState((draft) => {
                return { ...draft, paused: false };
            });
        });
        player.on("timeupdate", () => {
            setPlayerState((draft) => {
                return { ...draft, playedSeconds: player.currentTime() };
            });
        });
        player.one("durationchange", () => {
            setPlayerState((draft) => ({ ...draft, duration: player.duration() }));
        });
        player.on("ended", () => {
            const duration = Number(player.duration()) || 0;
            setPlayerState((draft) => ({
                ...draft,
                paused: true,
                playedSeconds: duration,
                duration,
            }));
            setTrailerEnded(true);
            setControlsVisible(true);
            window.clearTimeout(controlsTimerRef.current);
        });
        playerRef.current = player;
        player.tech(true).ytPlayer?.setPlaybackQuality?.("hd1080");
        setPlayerState((draft) => {
            return { ...draft, paused: player.paused() };
        });
        setPlayerInitialized(true);
    };
    const handleVolumeChange = (_, value) => {
        playerRef.current?.volume(value / 100);
        setPlayerState((draft) => {
            return { ...draft, volume: value / 100 };
        });
    };
    const handleSeekTo = (v) => {
        playerRef.current?.currentTime(v);
    };
    const handleReplay = () => {
        playerRef.current?.currentTime(0);
        setTrailerEnded(false);
        setPlayerState((draft) => ({ ...draft, playedSeconds: 0, paused: false }));
        playerRef.current?.play();
        revealControls();
    };
    const handleGoBack = () => {
        navigate("/browse");
    };
    const handleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        }
        else {
            void playerContainerRef.current?.requestFullscreen().catch(() => { });
        }
        revealControls();
    };
    const handlePlaybackRate = (rate) => {
        playerRef.current?.playbackRate(rate);
        setPlaybackRate(rate);
        setSettingsAnchor(null);
        revealControls();
    };
    const handlePlaybackQuality = (quality) => {
        setPlaybackQuality(quality);
        playerRef.current?.tech(true).ytPlayer?.setPlaybackQuality?.(quality);
        setSettingsAnchor(null);
        revealControls();
    };
    if (!videoId || !trailer) {
        return (<Box sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                bgcolor: "#000",
                color: "white",
                textAlign: "center",
                px: 3,
            }}>
        <PlayerControlButton onClick={handleGoBack}>
          <KeyboardBackspaceIcon />
        </PlayerControlButton>
        <Typography variant="h6">
          {!videoId
                ? "Choose a movie or series to watch its trailer."
                : isFetching
                    ? "Loading trailer..."
                    : isError
                        ? "Could not load this trailer."
                        : "No trailer is available for this title."}
        </Typography>
      </Box>);
    }
    if (!!videoJsOptions.width) {
        return (<Box ref={playerContainerRef} sx={{
                position: "relative",
                width: "100%",
                height: windowSize.height || "100vh",
                overflow: "hidden",
                bgcolor: "#000",
            }}>
        <VideoJSPlayer key={`${mediaType}-${videoId}-${trailer.key}-${captionLanguage}-${captionsEnabled}`} options={videoJsOptions} onReady={handlePlayerReady}/>
        {trailerEnded && (<Box sx={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(0,0,0,.38)",
                    color: "white",
                }}>
            <PlayerControlButton aria-label="Replay trailer" onClick={handleReplay} sx={{ p: 2, pointerEvents: "auto" }}>
              <ReplayIcon sx={{ fontSize: { xs: 48, sm: 68 } }}/>
            </PlayerControlButton>
          </Box>)}
        {playerRef.current && playerInitialized && (<Box onPointerEnter={revealControls} onPointerMove={revealControls} onTouchStart={revealControls} sx={{
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    position: "absolute",
                    cursor: controlsVisible ? "default" : "none",
                    color: "white",
                    zIndex: 3,
                    pointerEvents: controlsVisible ? "auto" : "none",
                }}>
            {controlsVisible && (<>
                <Box sx={{
                        position: "absolute",
                        inset: "55% 0 0",
                        background: "linear-gradient(180deg, transparent, rgba(0,0,0,.82))",
                        pointerEvents: "none",
                    }}/>
                <Box px={2} sx={{ position: "absolute", top: 24, left: 0 }}>
                  <PlayerControlButton onClick={handleGoBack} aria-label="Go back">
                    <KeyboardBackspaceIcon />
                  </PlayerControlButton>
                </Box>
                <Box sx={{
                        position: "absolute",
                        bottom: { xs: 82, sm: 94 },
                        left: { xs: 16, sm: 28, md: 40 },
                        maxWidth: { xs: "90%", md: 680 },
                        textShadow: "0 2px 12px rgba(0,0,0,.8)",
                    }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {title || "Trailer"}
                  </Typography>
                  <Typography variant="body1" sx={{
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                    }}>
                    {mediaDetail?.overview}
                  </Typography>
                </Box>
                <Box px={{ xs: 1, sm: 2 }} sx={{ position: "absolute", bottom: 18, left: 0, right: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PlayerSeekbar playedSeconds={playerState.playedSeconds} duration={playerState.duration} seekTo={handleSeekTo}/>
                  </Stack>
                  <Stack direction="row" alignItems="center">
                    <Stack direction="row" spacing={{ xs: 0.5, sm: 1.5, md: 2 }} alignItems="center">
                      {trailerEnded ? (<PlayerControlButton aria-label="Replay trailer" onClick={handleReplay}>
                          <ReplayIcon />
                        </PlayerControlButton>) : !playerState.paused ? (<PlayerControlButton aria-label="Pause trailer" onClick={() => playerRef.current?.pause()}>
                          <PauseIcon />
                        </PlayerControlButton>) : (<PlayerControlButton aria-label="Play trailer" onClick={() => playerRef.current?.play()}>
                          <PlayArrowIcon />
                        </PlayerControlButton>)}
                      <VolumeControllers muted={playerState.muted} handleVolumeToggle={() => {
                        playerRef.current?.muted(!playerState.muted);
                        setPlayerState((draft) => ({
                            ...draft,
                            muted: !draft.muted,
                        }));
                    }} value={playerState.volume} handleVolume={handleVolumeChange}/>
                      <Typography variant="caption" sx={{ color: "white" }}>
                        {`${formatTime(playerState.playedSeconds)} / ${formatTime(playerState.duration)}`}
                      </Typography>
                    </Stack>
                    <Box flexGrow={1}/>
                    <Stack direction="row" alignItems="center" flexWrap={{ xs: "wrap", sm: "nowrap" }} justifyContent="flex-end" spacing={{ xs: 0.5, sm: 1.5, md: 2 }}>
                      <PlayerControlButton aria-label="Trailer language" onClick={(event) => setLanguageAnchor(event.currentTarget)}>
                        <LanguageIcon />
                      </PlayerControlButton>
                      <Menu anchorEl={languageAnchor} open={!!languageAnchor} onClose={() => setLanguageAnchor(null)}>
                        <MenuItem selected={trailerLanguage === "auto"} onClick={() => {
                        setTrailerLanguage("auto");
                        setLanguageAnchor(null);
                    }}>
                          Auto trailer language
                        </MenuItem>
                        {["en", "hi"].map((language) => (<MenuItem key={language} selected={trailerLanguage === language} disabled={!availableTrailerLanguages.includes(language)} onClick={() => {
                            setTrailerLanguage(language);
                            setLanguageAnchor(null);
                        }}>
                            {language === "en" ? "English trailer" : "Hindi trailer"}
                          </MenuItem>))}
                      </Menu>
                      <PlayerControlButton aria-label={captionsEnabled ? "Turn captions off" : "Turn captions on"} color={captionsEnabled ? "primary" : "default"} onClick={() => setCaptionsEnabled((enabled) => !enabled)}>
                        <ClosedCaptionIcon />
                      </PlayerControlButton>
                      <PlayerControlButton aria-label={`Playback speed ${playbackRate}x`} onClick={(event) => setSettingsAnchor(event.currentTarget)}>
                        <SettingsIcon />
                      </PlayerControlButton>
                      <PlayerControlButton aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={handleFullscreen}>
                        {isFullscreen ? (<FullscreenExitIcon />) : (<FullscreenIcon />)}
                      </PlayerControlButton>
                    </Stack>
                  </Stack>
                </Box>
                <Menu anchorEl={settingsAnchor} open={!!settingsAnchor} onClose={() => setSettingsAnchor(null)} anchorOrigin={{ vertical: "top", horizontal: "right" }} transformOrigin={{ vertical: "bottom", horizontal: "right" }}>
                  {playbackQualities.map(([quality, label]) => (<MenuItem key={quality} selected={playbackQuality === quality} onClick={() => handlePlaybackQuality(quality)}>
                      {label}
                    </MenuItem>))}
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (<MenuItem key={rate} selected={playbackRate === rate} onClick={() => handlePlaybackRate(rate)}>
                      {rate}x
                    </MenuItem>))}
                  <MenuItem selected={captionLanguage === "en"} onClick={() => {
                        setCaptionLanguage("en");
                        setCaptionsEnabled(true);
                        setSettingsAnchor(null);
                    }}>
                    English captions
                  </MenuItem>
                  <MenuItem selected={captionLanguage === "hi"} onClick={() => {
                        setCaptionLanguage("hi");
                        setCaptionsEnabled(true);
                        setSettingsAnchor(null);
                    }}>
                    Hindi captions
                  </MenuItem>
                  <MenuItem onClick={() => {
                        setCaptionsEnabled(false);
                        setSettingsAnchor(null);
                    }}>
                    Captions off
                  </MenuItem>
                </Menu>
              </>)}
          </Box>)}
      </Box>);
    }
    return null;
}
Component.displayName = "WatchPage";

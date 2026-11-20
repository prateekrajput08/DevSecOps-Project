import { useState, useRef, useEffect } from "react";
import Slider, { Settings } from "react-slick";
import { motion } from "framer-motion";

import { styled, Theme, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import CustomNavigation from "./CustomNavigation";
import VideoItemWithHover from "src/components/VideoItemWithHover";
import NetflixNavigationLink from "src/components/NetflixNavigationLink";
import MotionContainer from "src/components/animate/MotionContainer";
import { varFadeIn } from "src/components/animate/variants/fade/FadeIn";
import { CustomGenre, Genre } from "src/types/Genre";
import { Movie } from "src/types/Movie";
import { MEDIA_TYPE, PaginatedMovieResult } from "src/types/Common";
import useWindowSize from "src/hooks/useWindowSize";

const RootStyle = styled("div")(() => ({
  position: "relative",
  overflow: "inherit",
  width: "100%",
}));

const StyledSlider = styled(Slider)(
  ({ theme }: { theme: Theme }) => ({
    display: "flex !important",
    justifyContent: "center",
    overflow: "initial !important",
    "& > .slick-list": {
      overflow: "visible",
    },
    [theme.breakpoints.up("sm")]: {
      "& > .slick-list": { width: "100%" },
      "& .slick-list > .slick-track": {
        margin: "0px !important",
      },
      "& .slick-list > .slick-track > .slick-current > div > .NetflixBox-root > .NetflixPaper-root:hover":
        {
          transformOrigin: "0% 50% !important",
        },
    },
    [theme.breakpoints.down("sm")]: {
      "& > .slick-list": {
        width: "100%",
      },
    },
  })
);

interface SlideItemProps {
  item: Movie;
  mediaType: MEDIA_TYPE;
}

function SlideItem({ item, mediaType }: SlideItemProps) {
  return (
    <Box sx={{ px: { xs: 0.5, sm: 1 }, boxSizing: "border-box" }}>
      <VideoItemWithHover video={item} mediaType={mediaType} />
    </Box>
  );
}

interface SlickSliderProps {
  data: PaginatedMovieResult;
  genre: Genre | CustomGenre;
  handleNext: (page: number) => void;
  mediaType: MEDIA_TYPE;
}
export default function SlickSlider({
  data,
  genre,
  handleNext: fetchNextPage,
  mediaType,
}: SlickSliderProps) {
  const sliderRef = useRef<Slider>(null);
  const requestedPageRef = useRef(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showExplore, setShowExplore] = useState(false);
  const { width } = useWindowSize();
  const theme = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const videos = data.results.filter((item) => {
    if (!item.backdrop_path && !item.poster_path) return false;
    if ((genre as CustomGenre).apiString !== "upcoming") return true;
    return !!item.release_date && new Date(`${item.release_date}T00:00:00`) >= today;
  });
  const slidesToShow =
    width === undefined || width >= 1536
      ? 6
      : width >= 1200
      ? 5
      : width >= 900
      ? 4
      : width >= 600
      ? 3
      : 2;
  const isUpcoming = (genre as CustomGenre).apiString === "upcoming";
  useEffect(() => {
    if (
      isUpcoming &&
      videos.length < slidesToShow &&
      data.page < Math.min(data.total_pages, 5) &&
      requestedPageRef.current < data.page + 1
    ) {
      requestedPageRef.current = data.page + 1;
      fetchNextPage(data.page + 1);
    }
  }, [
    isUpcoming,
    videos.length,
    slidesToShow,
    data.page,
    data.total_pages,
    fetchNextPage,
  ]);
  const isEnd = activeSlideIndex + slidesToShow >= videos.length;

  const beforeChange = (_currentIndex: number, nextIndex: number) => {
    setActiveSlideIndex(nextIndex);
  };

  const settings: Settings = {
    speed: 500,
    arrows: false,
    infinite: false,
    lazyLoad: "ondemand",
    slidesToShow: 6,
    slidesToScroll: 5,
    draggable: true,
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    // afterChange: (current) => {
    //   console.log("After Change", current);
    // },
    beforeChange,
    // onEdge: (direction) => {
    //   console.log("Edge: ", direction);
    // },
    responsive: [
      {
        breakpoint: 1536,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 5,
        },
      },
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 5,
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 5,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 5,
        },
      },
    ],
  };

  const handlePrevious = () => {
    sliderRef.current?.slickGoTo(Math.max(0, activeSlideIndex - 5));
  };

  const handleNext = () => {
    sliderRef.current?.slickGoTo(
      Math.min(activeSlideIndex + 5, videos.length - slidesToShow)
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
    >
      <Box sx={{ overflow: "hidden", height: "100%", zIndex: 1 }}>
        {videos.length > 0 && (
          <>
            <Stack
              spacing={2}
              direction="row"
              alignItems="center"
              sx={{
                mb: { xs: 1.25, md: 2 },
                pl: { xs: 2, sm: 4, md: 7.5 },
                pr: { xs: 2, sm: 4, md: 7.5 },
                justifyContent: "space-between",
              }}
            >
              <NetflixNavigationLink
                variant="h5"
                to={`/genre/${
                  genre.id || genre.name.toLowerCase().replace(" ", "_")
                }`}
                sx={{
                  display: "inline-block",
                  fontWeight: 700,
                  transition: "color .2s ease",
                  "&:hover": { color: "rgba(255,255,255,.76)" },
                }}
                onMouseOver={() => {
                  setShowExplore(true);
                }}
                onMouseLeave={() => {
                  setShowExplore(false);
                }}
              >
                {`${genre.name} ${
                  mediaType === MEDIA_TYPE.Tv ? "Series" : "Movies"
                } `}
                <MotionContainer
                  open={showExplore}
                  initial="initial"
                  sx={{ display: "inline", color: "success.main" }}
                >
                  {"Explore All".split("").map((letter, index) => (
                    <motion.span key={index} variants={varFadeIn}>
                      {letter}
                    </motion.span>
                  ))}
                </MotionContainer>
              </NetflixNavigationLink>
              <CustomNavigation
                isEnd={isEnd}
                onNext={handleNext}
                onPrevious={handlePrevious}
                activeSlideIndex={activeSlideIndex}
              />
            </Stack>

            <Box sx={{ px: { xs: 2, sm: 4, md: 7.5 } }}>
              <RootStyle>
                <StyledSlider ref={sliderRef} {...settings} theme={theme}>
                  {videos.map((item) => (
                    <SlideItem
                      key={item.id}
                      item={item}
                      mediaType={mediaType}
                    />
                  ))}
                </StyledSlider>
              </RootStyle>
            </Box>
          </>
        )}
      </Box>
    </motion.div>
  );
}

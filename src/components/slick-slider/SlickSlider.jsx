import { useState, useRef, useEffect } from "react";
import SliderModule from "react-slick";
import { motion } from "framer-motion";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import CustomNavigation from "./CustomNavigation";
import VideoItemWithHover from "src/components/VideoItemWithHover";
import NetflixNavigationLink from "src/components/NetflixNavigationLink";
import { MEDIA_TYPE } from "src/types/Common";
import useWindowSize from "src/hooks/useWindowSize";
const Slider = SliderModule.default ?? SliderModule;
const RootStyle = styled("div")(() => ({
    position: "relative",
    overflow: "inherit",
    width: "100%",
}));
const StyledSlider = styled(Slider)(({ theme }) => ({
    overflow: "initial !important",
    "& .slick-track": {
        display: "flex !important",
        flexWrap: "nowrap",
    },
    "& .slick-slide": { height: "auto", flex: "0 0 auto" },
    "& > .slick-list": {
        overflow: "visible",
    },
    [theme.breakpoints.up("sm")]: {
        "& > .slick-list": { width: "100%" },
        "& .slick-list > .slick-track": {
            margin: "0px !important",
        },
        "& .slick-list > .slick-track > .slick-current > div > .NetflixBox-root > .NetflixPaper-root:hover": {
            transformOrigin: "0% 50% !important",
        },
    },
    [theme.breakpoints.down("sm")]: {
        "& > .slick-list": {
            width: "100%",
        },
    },
}));
function SlideItem({ item, mediaType }) {
    return (<Box sx={{ px: 0.75, boxSizing: "border-box" }}>
      <VideoItemWithHover video={item} mediaType={mediaType}/>
    </Box>);
}
export default function SlickSlider({ data, genre, handleNext: fetchNextPage, mediaType, }) {
    const sliderRef = useRef(null);
    const requestedPageRef = useRef(0);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const { width } = useWindowSize();
    const theme = useTheme();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const videos = data.results.filter((item) => {
        if (!item.backdrop_path && !item.poster_path)
            return false;
        if (genre.apiString !== "upcoming")
            return true;
        return !!item.release_date && new Date(`${item.release_date}T00:00:00`) >= today;
    });
    const slidesToShow = width === undefined || width >= 1536
        ? 5.5
        : width >= 1200
            ? 4.5
            : width >= 900
                ? 3.5
                : width >= 600
                    ? 2.5
                    : 1.5;
    const scrollBy = Math.max(1, Math.floor(slidesToShow) - 1);
    const isUpcoming = genre.apiString === "upcoming";
    useEffect(() => {
        if (isUpcoming &&
            videos.length < slidesToShow &&
            data.page < Math.min(data.total_pages, 5) &&
            requestedPageRef.current < data.page + 1) {
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
    const beforeChange = (_currentIndex, nextIndex) => {
        setActiveSlideIndex(nextIndex);
    };
    const settings = {
        speed: 500,
        arrows: false,
        infinite: false,
        lazyLoad: "ondemand",
        slidesToShow,
        slidesToScroll: scrollBy,
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
    };
    const handlePrevious = () => {
        sliderRef.current?.slickGoTo(Math.max(0, activeSlideIndex - scrollBy));
    };
    const handleNext = () => {
        sliderRef.current?.slickGoTo(Math.min(activeSlideIndex + scrollBy, videos.length - Math.ceil(slidesToShow)));
    };
    return (<motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.38, ease: "easeOut" }}>
      <Box sx={{ overflow: "hidden", height: "100%", zIndex: 1 }}>
        {videos.length > 0 && (<>
            <Stack spacing={2} direction="row" alignItems="center" sx={{
                mb: { xs: 1.25, md: 2 },
                pl: { xs: 2, sm: 3, md: 3 },
                pr: { xs: 2, sm: 3, md: 3 },
                justifyContent: "space-between",
            }}>
              <NetflixNavigationLink variant="h5" to={`/genre/${mediaType}/${genre.id || genre.name.toLowerCase().replace(" ", "_")}`} sx={{
                display: "inline-block",
                fontWeight: 700,
                transition: "color .2s ease",
                "&:hover": { color: "rgba(255,255,255,.76)" },
            }}>
                {`${genre.name} ${mediaType === MEDIA_TYPE.Tv ? "Series" : "Movies"} `}
              </NetflixNavigationLink>
              <CustomNavigation isEnd={isEnd} onNext={handleNext} onPrevious={handlePrevious} activeSlideIndex={activeSlideIndex}/>
            </Stack>

            <Box sx={{ px: { xs: 2, sm: 3, md: 3 } }}>
              <RootStyle>
                <StyledSlider ref={sliderRef} {...settings} theme={theme}>
                  {videos.map((item) => (<SlideItem key={item.id} item={item} mediaType={mediaType}/>))}
                </StyledSlider>
              </RootStyle>
            </Box>
          </>)}
      </Box>
    </motion.div>);
}

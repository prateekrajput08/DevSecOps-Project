import { useRef, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import VideoItemWithHover from "./VideoItemWithHover";
import { CustomGenre, Genre } from "src/types/Genre";
import { PaginatedMovieResult } from "src/types/Common";
import useIntersectionObserver from "src/hooks/useIntersectionObserver";
import { motion } from "framer-motion";
import { MEDIA_TYPE } from "src/types/Common";

interface GridWithInfiniteScrollProps {
  genre: Genre | CustomGenre;
  data: PaginatedMovieResult;
  handleNext: (page: number) => void;
  mediaType: MEDIA_TYPE;
}
export default function GridWithInfiniteScroll({
  genre,
  data,
  handleNext,
  mediaType,
}: GridWithInfiniteScrollProps) {
  const intersectionRef = useRef<HTMLDivElement>(null);
  const intersection = useIntersectionObserver(intersectionRef);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const videos = data.results.filter((video) => {
    if (!video.backdrop_path && !video.poster_path) return false;
    if ((genre as CustomGenre).apiString !== "upcoming") return true;
    return !!video.release_date && new Date(`${video.release_date}T00:00:00`) >= today;
  });

  useEffect(() => {
    if (
      intersection &&
      intersection.intersectionRatio === 1 &&
      data.page < data.total_pages
    ) {
      handleNext(data.page + 1);
    }
  }, [intersection]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.08 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      >
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 4, md: 7.5 },
            pb: { xs: 5, md: 7 },
            pt: "150px",
            bgcolor: "inherit",
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: "text.primary", mb: 2 }}
          >
            {`${genre.name} ${
              mediaType === MEDIA_TYPE.Tv ? "Series" : "Movies"
            }`}
          </Typography>
          <Grid container spacing={2}>
            {videos.map((video, idx) => (
                <Grid
                  key={`${video.id}_${idx}`}
                  item
                  xs={6}
                  sm={4}
                  md={2}
                  sx={{ zIndex: 1 }}
                >
                  <VideoItemWithHover video={video} mediaType={mediaType} />
                </Grid>
              ))}
          </Grid>
        </Container>
      </motion.div>
      <Box sx={{ display: "hidden" }} ref={intersectionRef} />
    </>
  );
}

import { useSearchParams } from "react-router-dom";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import VideoItemWithHover from "src/components/VideoItemWithHover";
import { useSearchMultiQuery } from "src/store/slices/discover";
import { MEDIA_TYPE } from "src/types/Common";
import { Movie } from "src/types/Movie";

export function Component() {
  const [params] = useSearchParams();
  const query = params.get("query")?.trim() ?? "";
  const { data, isFetching } = useSearchMultiQuery(query, { skip: query.length < 2 });
  const titles = data?.results.filter(
    (item) =>
      (item.media_type === MEDIA_TYPE.Movie || item.media_type === MEDIA_TYPE.Tv) &&
      !!(item.backdrop_path || item.poster_path)
  ) ?? [];

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 7.5 }, pt: "110px", pb: 8 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {query ? `Results for “${query}”` : "Search titles"}
      </Typography>
      {isFetching && <Typography>Searching…</Typography>}
      {!isFetching && query.length >= 2 && !titles.length && (
        <Typography color="text.secondary">No titles found.</Typography>
      )}
      <Grid container spacing={2}>
        {titles.map((title) => (
          <Grid item xs={6} sm={4} md={2} key={`${title.media_type}-${title.id}`}>
            <VideoItemWithHover
              video={title as Movie}
              mediaType={title.media_type as MEDIA_TYPE}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

Component.displayName = "SearchPage";

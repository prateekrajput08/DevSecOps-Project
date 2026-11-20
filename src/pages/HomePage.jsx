import Stack from "@mui/material/Stack";
import { COMMON_TITLES } from "src/constant";
import HeroSection from "src/components/HeroSection";
import { genreSliceEndpoints, useGetGenresQuery } from "src/store/slices/genre";
import { MEDIA_TYPE } from "src/types/Common";
import SliderRowForGenre from "src/components/VideoSlider";
import store from "src/store";
import { useLocation } from "react-router-dom";
const TV_TITLES = [
    { name: "Popular", apiString: "popular" },
    { name: "Top Rated", apiString: "top_rated" },
    { name: "Airing Today", apiString: "airing_today" },
    { name: "On The Air", apiString: "on_the_air" },
];
export async function loader() {
    await store.dispatch(genreSliceEndpoints.getGenres.initiate(MEDIA_TYPE.Movie));
    return null;
}
export function Component() {
    const mediaType = useLocation().pathname === "/series" ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie;
    const { data: genres, isSuccess } = useGetGenresQuery(mediaType);
    if (isSuccess && genres && genres.length > 0) {
        return (<>
        <HeroSection mediaType={mediaType}/>
        <Stack spacing={{ xs: 1.5, md: 2 }}>
        {[...(mediaType === MEDIA_TYPE.Tv ? TV_TITLES : COMMON_TITLES), ...genres].map((genre) => (<SliderRowForGenre key={genre.id || genre.name} genre={genre} mediaType={mediaType}/>))}
        </Stack>
      </>);
    }
    return null;
}
Component.displayName = "HomePage";

import { useLoaderData, useParams, } from "react-router-dom";
import { COMMON_TITLES } from "src/constant";
import GridPage from "src/components/GridPage";
import { MEDIA_TYPE } from "src/types/Common";
import { genreSliceEndpoints,
// useGetGenresQuery
 } from "src/store/slices/genre";
import store from "src/store";
export async function loader({ params }) {
    const mediaType = params.mediaType === MEDIA_TYPE.Tv ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie;
    let genre = COMMON_TITLES.find((t) => t.apiString === params.genreId);
    if (!genre) {
        const genres = await store
            .dispatch(genreSliceEndpoints.getGenres.initiate(mediaType))
            .unwrap();
        genre = genres?.find((t) => t.id.toString() === params.genreId);
    }
    return genre;
}
export function Component() {
    const { mediaType: routeMediaType } = useParams();
    const genre = useLoaderData();
    // const { genreId } = useParams();
    // const { data: genres } = useGetGenresQuery(MEDIA_TYPE.Movie);
    // let genre: Genre | CustomGenre | undefined;
    // if (isNaN(parseInt(genreId!))) {
    //   genre = COMMON_TITLES.find((t) => t.apiString === genreId);
    // } else {
    //   genre = genres?.find((t) => t.id.toString() === genreId);
    // }
    if (genre) {
        return <GridPage mediaType={routeMediaType === MEDIA_TYPE.Tv ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie} genre={genre}/>;
    }
    return null;
}
Component.displayName = "GenreExplore";

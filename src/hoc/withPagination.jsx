import { useCallback, useEffect } from "react";
import MainLoadingScreen from "src/components/MainLoadingScreen";
import { useAppDispatch, useAppSelector } from "src/hooks/redux";
import { initiateItem, useLazyGetVideosByMediaTypeAndGenreIdQuery, useLazyGetVideosByMediaTypeAndCustomGenreQuery, } from "src/store/slices/discover";
export default function withPagination(Component, mediaType, genre) {
    return function WithPagination() {
        const dispatch = useAppDispatch();
        const itemKey = genre.id ?? genre.apiString;
        const mediaState = useAppSelector((state) => state.discover[mediaType]);
        const pageState = mediaState ? mediaState[itemKey] : undefined;
        const [getVideosByMediaTypeAndGenreId] = useLazyGetVideosByMediaTypeAndGenreIdQuery();
        const [getVideosByMediaTypeAndCustomGenre] = useLazyGetVideosByMediaTypeAndCustomGenreQuery();
        useEffect(() => {
            if (!mediaState || !pageState) {
                dispatch(initiateItem({ mediaType, itemKey }));
            }
        }, [mediaState, pageState]);
        useEffect(() => {
            if (pageState && pageState.page === 0) {
                handleNext(pageState.page + 1);
            }
        }, [pageState]);
        const handleNext = useCallback((page) => {
            if (genre.id) {
                getVideosByMediaTypeAndGenreId({
                    mediaType,
                    genreId: genre.id,
                    page,
                });
            }
            else {
                getVideosByMediaTypeAndCustomGenre({
                    mediaType,
                    apiString: genre.apiString,
                    page,
                    companyId: genre.companyId,
                    collectionId: genre.collectionId,
                });
            }
            // dispatch(setNextPage({ mediaType, itemKey }));
        }, []);
        if (pageState) {
            return (<Component genre={genre} data={pageState} handleNext={handleNext} mediaType={mediaType}/>);
        }
        return <MainLoadingScreen />;
    };
}

import { TMDB_V3_API_KEY } from "src/constant";
import { tmdbApi } from "./apiSlice";
import { MEDIA_TYPE } from "src/types/Common";
import { createSlice, isAnyOf } from "@reduxjs/toolkit";
const initialState = {};
export const initialItemState = {
    page: 0,
    results: [],
    total_pages: 0,
    total_results: 0,
};
const discoverSlice = createSlice({
    name: "discover",
    initialState,
    reducers: {
        setNextPage: (state, action) => {
            const { mediaType, itemKey } = action.payload;
            state[mediaType][itemKey].page += 1;
        },
        initiateItem: (state, action) => {
            const { mediaType, itemKey } = action.payload;
            if (!state[mediaType]) {
                state[mediaType] = {};
            }
            if (!state[mediaType][itemKey]) {
                state[mediaType][itemKey] = initialItemState;
            }
        },
    },
    extraReducers(builder) {
        builder.addMatcher(isAnyOf(extendedApi.endpoints.getVideosByMediaTypeAndCustomGenre.matchFulfilled, extendedApi.endpoints.getVideosByMediaTypeAndGenreId.matchFulfilled), (state, action) => {
            const { page, results, total_pages, total_results, mediaType, itemKey, } = action.payload;
            state[mediaType][itemKey].page = page;
            state[mediaType][itemKey].results.push(...results);
            state[mediaType][itemKey].total_pages = total_pages;
            state[mediaType][itemKey].total_results = total_results;
        });
    },
});
export const { setNextPage, initiateItem } = discoverSlice.actions;
export default discoverSlice.reducer;
const extendedApi = tmdbApi.injectEndpoints({
    endpoints: (build) => ({
        getEnglishBackdrops: build.query({
            query: ({ mediaType, id }) => ({
                url: `/${mediaType}/${id}/images`,
                params: {
                    api_key: TMDB_V3_API_KEY,
                    language: "en-US",
                    include_image_language: "en,null",
                },
            }),
        }),
        getVideosByMediaTypeAndGenreId: build.query({
            query: ({ mediaType, genreId, page }) => ({
                url: `/discover/${mediaType}`,
                params: { api_key: TMDB_V3_API_KEY, language: "en-US", with_genres: genreId, page },
            }),
            transformResponse: (response, _, { mediaType, genreId }) => ({
                ...response,
                mediaType,
                itemKey: genreId,
            }),
        }),
        getVideosByMediaTypeAndCustomGenre: build.query({
            query: ({ mediaType, apiString, page, companyId, collectionId }) => companyId
                ? {
                    url: `/discover/${mediaType}`,
                    params: {
                        api_key: TMDB_V3_API_KEY,
                        language: "en-US",
                        with_companies: companyId,
                        page,
                    },
                }
                : collectionId
                    ? {
                        url: `/collection/${collectionId}`,
                        params: { api_key: TMDB_V3_API_KEY, language: "en-US" },
                    }
                    : {
                        url: `/${mediaType}/${apiString}`,
                        params: { api_key: TMDB_V3_API_KEY, language: "en-US", page },
                    },
            transformResponse: (response, _, { mediaType, apiString }) => {
                return {
                    ...("parts" in response
                        ? {
                            page: 1,
                            results: response.parts,
                            total_pages: 1,
                            total_results: response.parts.length,
                        }
                        : response),
                    mediaType,
                    itemKey: apiString,
                };
            },
        }),
        searchMulti: build.query({
            query: (query) => ({
                url: "/search/multi",
                params: { api_key: TMDB_V3_API_KEY, query, include_adult: false },
            }),
        }),
        getAppendedVideos: build.query({
            query: ({ mediaType, id }) => ({
                url: `/${mediaType}/${id}`,
                params: {
                    api_key: TMDB_V3_API_KEY,
                    append_to_response: mediaType === MEDIA_TYPE.Movie
                        ? "videos,credits,release_dates"
                        : "videos,credits,content_ratings",
                },
            }),
        }),
        getSimilarVideos: build.query({
            query: ({ mediaType, id }) => ({
                url: `/${mediaType}/${id}/similar`,
                params: { api_key: TMDB_V3_API_KEY, language: "en-US" },
            }),
        }),
    }),
});
export const { useGetVideosByMediaTypeAndGenreIdQuery, useGetEnglishBackdropsQuery, useLazyGetVideosByMediaTypeAndGenreIdQuery, useGetVideosByMediaTypeAndCustomGenreQuery, useLazyGetVideosByMediaTypeAndCustomGenreQuery, useSearchMultiQuery, useGetAppendedVideosQuery, useLazyGetAppendedVideosQuery, useGetSimilarVideosQuery, useLazyGetSimilarVideosQuery, } = extendedApi;

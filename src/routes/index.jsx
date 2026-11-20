import { Navigate, createBrowserRouter } from "react-router-dom";
import { MAIN_PATH } from "src/constant";
import MainLayout from "src/layouts/MainLayout";
import MainLoadingScreen from "src/components/MainLoadingScreen";
const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        HydrateFallback: MainLoadingScreen,
        children: [
            {
                path: MAIN_PATH.root,
                lazy: () => import("src/pages/HomePage"),
            },
            {
                path: "series",
                lazy: () => import("src/pages/HomePage"),
            },
            {
                path: "movies",
                lazy: () => import("src/pages/HomePage"),
            },
            {
                path: MAIN_PATH.browse,
                element: <Navigate to="/" replace/>,
            },
            {
                path: MAIN_PATH.genreExplore,
                children: [
                    {
                        path: ":mediaType/:genreId",
                        lazy: () => import("src/pages/GenreExplore"),
                    },
                    {
                        path: ":genreId",
                        lazy: () => import("src/pages/GenreExplore"),
                    },
                ],
            },
            {
                path: MAIN_PATH.watch,
                lazy: () => import("src/pages/WatchPage"),
            },
            {
                path: "search",
                lazy: () => import("src/pages/SearchPage"),
            },
        ],
    },
]);
export default router;

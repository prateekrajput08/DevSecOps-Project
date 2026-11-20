import withPagination from "src/hoc/withPagination";
import GridWithInfiniteScroll from "./GridWithInfiniteScroll";
export default function GridPage({ genre, mediaType }) {
    const Component = withPagination(GridWithInfiniteScroll, mediaType, genre);
    return <Component />;
}

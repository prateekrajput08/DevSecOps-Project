import withPagination from "src/hoc/withPagination";
import SlickSlider from "./slick-slider/SlickSlider";
export default function SliderRowForGenre({ genre, mediaType, }) {
    const Component = withPagination(SlickSlider, mediaType, genre);
    return <Component />;
}

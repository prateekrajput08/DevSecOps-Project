import { useRef } from "react";
import Box from "@mui/material/Box";
import { useDetailModal } from "src/providers/DetailModalProvider";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { useGetEnglishBackdropsQuery } from "src/store/slices/discover";
import useIntersectionObserver from "src/hooks/useIntersectionObserver";
import VideoItemWithHoverPure from "./VideoItemWithHoverPure";
export default function VideoItemWithHover({ video, mediaType, }) {
    const { setDetailType } = useDetailModal();
    const { data: configuration } = useGetConfigurationQuery(undefined);
    const cardRef = useRef(null);
    const visible = useIntersectionObserver(cardRef, { rootMargin: "250px" });
    const { data: images } = useGetEnglishBackdropsQuery({ mediaType, id: video.id }, { skip: !visible?.isIntersecting });
    const backdropPath = images?.backdrops.find((image) => image.iso_639_1 === "en")?.file_path
        || images?.backdrops.find((image) => !image.iso_639_1)?.file_path
        || video.backdrop_path;
    return (<Box ref={cardRef}>
      <VideoItemWithHoverPure title={video.title || video.name || "Untitled"} onClick={() => setDetailType({ mediaType, id: video.id, title: video.title || video.name || "Untitled" })} src={backdropPath && configuration?.images.base_url
            ? `${configuration.images.base_url}w780${backdropPath}`
            : undefined}/>
    </Box>);
}

import { Movie } from "src/types/Movie";
import { useDetailModal } from "src/providers/DetailModalProvider";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import VideoItemWithHoverPure from "./VideoItemWithHoverPure";
import { MEDIA_TYPE } from "src/types/Common";
interface VideoItemWithHoverProps {
  video: Movie;
  mediaType: MEDIA_TYPE;
}

export default function VideoItemWithHover({
  video,
  mediaType,
}: VideoItemWithHoverProps) {
  const { setDetailType } = useDetailModal();
  const { data: configuration } = useGetConfigurationQuery(undefined);

  return (
    <VideoItemWithHoverPure
      title={
        video.title || (video as Movie & { name?: string }).name || "Untitled"
      }
      isPoster={!!video.poster_path}
      onClick={() => setDetailType({ mediaType, id: video.id })}
      src={`${configuration?.images.base_url}${
        video.poster_path
          ? `w342${video.poster_path}`
          : `w300${video.backdrop_path}`
      }`}
    />
  );
}

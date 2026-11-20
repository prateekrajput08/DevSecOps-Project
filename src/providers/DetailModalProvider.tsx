import { ReactNode, useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

import { INITIAL_DETAIL_STATE } from "src/constant";
import createSafeContext from "src/lib/createSafeContext";
import { useLazyGetAppendedVideosQuery } from "src/store/slices/discover";
import { MEDIA_TYPE } from "src/types/Common";
import { MovieDetail } from "src/types/Movie";

interface DetailType {
  id?: number;
  mediaType?: MEDIA_TYPE;
}
export interface DetailModalConsumerProps {
  detail: { mediaDetail?: MovieDetail; loading?: boolean; error?: boolean } & DetailType;
  setDetailType: (newDetailType: DetailType) => void;
}

export const [useDetailModal, Provider] =
  createSafeContext<DetailModalConsumerProps>();

export default function DetailModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const [detail, setDetail] = useState<
    { mediaDetail?: MovieDetail; loading?: boolean; error?: boolean } & DetailType
  >(INITIAL_DETAIL_STATE);

  const [getAppendedVideos] = useLazyGetAppendedVideosQuery();
  const requestId = useRef(0);

  const handleChangeDetail = useCallback(
    async (newDetailType: { mediaType?: MEDIA_TYPE; id?: number }) => {
      if (!!newDetailType.id && newDetailType.mediaType) {
        const currentRequest = ++requestId.current;
        setDetail({ ...newDetailType, loading: true });
        try {
          const response = await getAppendedVideos({
            mediaType: newDetailType.mediaType,
            id: newDetailType.id,
          }).unwrap();
          if (currentRequest === requestId.current) {
            setDetail({ ...newDetailType, mediaDetail: response });
          }
        } catch {
          if (currentRequest === requestId.current) {
            setDetail({ ...newDetailType, error: true });
          }
        }
      } else {
        requestId.current += 1;
        setDetail(INITIAL_DETAIL_STATE);
      }
    },
    []
  );

  useEffect(() => {
    requestId.current += 1;
    setDetail(INITIAL_DETAIL_STATE);
  }, [location.pathname, setDetail]);

  return (
    <Provider value={{ detail, setDetailType: handleChangeDetail }}>
      {children}
    </Provider>
  );
}

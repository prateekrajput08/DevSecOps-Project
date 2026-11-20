import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { INITIAL_DETAIL_STATE } from "src/constant";
import createSafeContext from "src/lib/createSafeContext";
import { useLazyGetAppendedVideosQuery } from "src/store/slices/discover";
export const [useDetailModal, Provider] = createSafeContext();
export default function DetailModalProvider({ children, }) {
    const location = useLocation();
    const [detail, setDetail] = useState(INITIAL_DETAIL_STATE);
    const [getAppendedVideos] = useLazyGetAppendedVideosQuery();
    const requestId = useRef(0);
    const handleChangeDetail = useCallback(async (newDetailType) => {
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
            }
            catch {
                if (currentRequest === requestId.current) {
                    setDetail({ ...newDetailType, error: true });
                }
            }
        }
        else {
            requestId.current += 1;
            setDetail(INITIAL_DETAIL_STATE);
        }
    }, []);
    useEffect(() => {
        requestId.current += 1;
        setDetail(INITIAL_DETAIL_STATE);
    }, [location.pathname, setDetail]);
    return (<Provider value={{ detail, setDetailType: handleChangeDetail }}>
      {children}
    </Provider>);
}

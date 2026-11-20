import { useState, useCallback } from "react";
import { MEDIA_TYPE } from "src/types/Common";
import createSafeContext from "src/lib/createSafeContext";
export const [usePortal, Provider] = createSafeContext();
export const [usePortalData, PortalDataProvider] = createSafeContext();
export default function PortalProvider({ children }) {
    const [anchorElement, setAnchorElement] = useState(null);
    const [miniModalMediaData, setMiniModalMediaData] = useState(null);
    const [mediaType, setMediaType] = useState(MEDIA_TYPE.Movie);
    const handleChangePortal = useCallback((anchor, video, selectedMediaType = MEDIA_TYPE.Movie) => {
        setAnchorElement(anchor);
        setMiniModalMediaData(video);
        setMediaType(selectedMediaType);
    }, []);
    return (<Provider value={handleChangePortal}>
      <PortalDataProvider value={{
            anchorElement,
            miniModalMediaData,
            mediaType,
        }}>
        {children}
      </PortalDataProvider>
    </Provider>);
}

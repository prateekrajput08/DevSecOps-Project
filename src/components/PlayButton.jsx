import Button from "@mui/material/Button";
import PlayArrowIcon from "@mui/icons-material/esm/PlayArrow.js";
import { useNavigate } from "react-router-dom";
import { MAIN_PATH } from "src/constant";
import { MEDIA_TYPE } from "src/types/Common";
export default function PlayButton({ mediaType = MEDIA_TYPE.Movie, videoId, sx, ...others }) {
    const navigate = useNavigate();
    return (<Button color="inherit" variant="contained" startIcon={<PlayArrowIcon sx={{
                fontSize: {
                    xs: "19px !important",
                    sm: "21px !important",
                    md: "22px !important",
                },
            }}/>} {...others} sx={{
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.65, sm: 0.8 },
            fontSize: { xs: 14, sm: 15, md: 16 },
            lineHeight: 1.35,
            fontWeight: "bold",
            whiteSpace: "nowrap",
            textTransform: "capitalize",
            ...sx,
        }} onClick={() => navigate(videoId
            ? `/${MAIN_PATH.watch}?mediaType=${mediaType}&id=${videoId}`
            : `/${MAIN_PATH.watch}`)}>
      Play
    </Button>);
}

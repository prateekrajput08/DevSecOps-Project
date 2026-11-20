import { styled } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ArrowBackIosNewIcon from "@mui/icons-material/esm/ArrowBackIosNew.js";
import ArrowForwardIosIcon from "@mui/icons-material/esm/ArrowForwardIos.js";
const ArrowStyle = styled(IconButton)(({ theme }) => ({
    color: theme.palette.common.white,
    border: "1px solid rgba(255,255,255,.28)",
    width: 32,
    height: 32,
    transition: theme.transitions.create(["transform", "background-color"]),
    "&.Mui-disabled": { color: "rgba(255,255,255,.28)" },
    "&:hover": {
        background: "rgba(255,255,255,.14)",
        transform: "scale(1.08)",
    },
}));
export default function CustomNavigation({ isEnd, onNext, onPrevious, activeSlideIndex, }) {
    return (<Stack direction="row" spacing={0.75}>
      <ArrowStyle size="small" aria-label="Scroll movies left" disabled={activeSlideIndex <= 0} onClick={onPrevious}>
        <ArrowBackIosNewIcon fontSize="small"/>
      </ArrowStyle>
      <ArrowStyle size="small" aria-label="Scroll movies right" disabled={isEnd} onClick={onNext}>
        <ArrowForwardIosIcon fontSize="small"/>
      </ArrowStyle>
    </Stack>);
}

import { Stack } from "@mui/material";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import VolumeUpIcon from "@mui/icons-material/esm/VolumeUp.js";
import VolumeOffIcon from "@mui/icons-material/esm/VolumeOff.js";
import PlayerControlButton from "./PlayerControlButton";
const StyledSlider = styled(Slider)({
    height: 5,
    borderRadius: 0,
    padding: 0,
    "& .NetflixSlider-track": {
        border: "none",
        backgroundColor: "red",
    },
    "& .NetflixSlider-rail": {
        border: "none",
        backgroundColor: "white",
        opacity: 0.85,
    },
    "& .NetflixSlider-thumb": {
        height: 10,
        width: 10,
        backgroundColor: "red",
        "&:focus, &:hover, &.Netflix-active, &.Netflix-focusVisible": {
            boxShadow: "inherit",
            height: 15,
            width: 15,
        },
        "&:before": {
            display: "none",
        },
    },
});
export default function VolumeControllers({ value, handleVolume, handleVolumeToggle, muted, }) {
    return (<Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
      <PlayerControlButton onClick={handleVolumeToggle}>
        {!muted ? <VolumeUpIcon /> : <VolumeOffIcon />}
      </PlayerControlButton>
      <StyledSlider max={100} value={value * 100} valueLabelDisplay="auto" valueLabelFormat={(x) => x} onChange={handleVolume} sx={{ width: { xs: 60, sm: 80, md: 100 } }}/>
    </Stack>);
}

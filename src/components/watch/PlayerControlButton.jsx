import { forwardRef } from "react";
import IconButton from "@mui/material/IconButton";
const PlayerControlButton = forwardRef(({ children, ...others }, ref) => (<IconButton ref={ref} sx={{
        padding: { xs: 0.5, sm: 1 },
        transform: "none !important",
        "&:hover, &:focus": { transform: "none !important" },
        "& svg, & span": { transition: "none", transform: "none !important" },
    }} {...others}>
      {children}
    </IconButton>));
export default PlayerControlButton;

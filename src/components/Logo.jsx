import Box from "@mui/material/Box";
import { Link as RouterLink } from "react-router-dom";
import { MAIN_PATH } from "src/constant";
export default function Logo({ sx }) {
    return (<RouterLink to={`/${MAIN_PATH.browse}`}>
      <Box component="img" alt="Netflix" src="/assets/netflix-logo.png" width={87} height={25} sx={{
            objectFit: "contain",
            ...sx,
        }}/>
    </RouterLink>);
}

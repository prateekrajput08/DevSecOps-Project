import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Logo from "../Logo";
export default function Footer() {
    return (<Box component="footer" sx={{
            mt: { xs: 6, md: 9 },
            px: { xs: 2, sm: 4, md: 7.5 },
            py: { xs: 4, md: 5 },
            borderTop: "1px solid rgba(255,255,255,.1)",
            bgcolor: "#0b0b0b",
        }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
        <Logo />
        <Typography variant="caption" color="text.secondary">
          Movie information and artwork provided by TMDB.
        </Typography>
      </Stack>
    </Box>);
}

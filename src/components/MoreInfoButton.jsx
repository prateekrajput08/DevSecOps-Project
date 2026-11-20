import Button from "@mui/material/Button";
import InfoOutlinedIcon from "@mui/icons-material/esm/InfoOutlined.js";
export default function MoreInfoButton({ sx, ...others }) {
    return (<Button variant="contained" startIcon={<InfoOutlinedIcon sx={{
                fontSize: {
                    xs: "19px !important",
                    sm: "21px !important",
                    md: "22px !important",
                },
            }}/>} {...others} sx={{
            ...sx,
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.65, sm: 0.8 },
            fontSize: { xs: 14, sm: 15, md: 16 },
            lineHeight: 1.35,
            fontWeight: "bold",
            textTransform: "capitalize",
            bgcolor: "#6d6d6eb3",
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: "#6d6d6e66" },
        }}>
      More Info
    </Button>);
}

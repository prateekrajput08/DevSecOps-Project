import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/esm/Search.js";
const Search = styled("div")(({ theme }) => ({
    position: "relative",
    width: "100%",
    display: "flex",
    alignItems: "center",
}));
const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: "inherit",
    "& .NetflixInputBase-input": {
        width: 0,
        transition: theme.transitions.create("width", {
            duration: theme.transitions.duration.complex,
            easing: theme.transitions.easing.easeIn,
        }),
        "&:focus": {
            width: "auto",
        },
    },
}));
export default function SearchBox() {
    const [isFocused, setIsFocused] = useState(false);
    const [query, setQuery] = useState("");
    const searchInputRef = useRef(null);
    const navigate = useNavigate();
    const handleSubmit = (event) => {
        event.preventDefault();
        if (query.trim()) {
            navigate(`/search?query=${encodeURIComponent(query.trim())}`);
            searchInputRef.current?.blur();
        }
        else {
            searchInputRef.current?.focus();
        }
    };
    return (<Box component="form" onSubmit={handleSubmit} sx={{ width: isFocused ? { xs: 150, sm: 270 } : 40 }}>
      <Search sx={{
            border: isFocused ? "1px solid white" : "1px solid transparent",
            backgroundColor: isFocused ? "rgba(0,0,0,.9)" : "transparent",
            transition: "width .2s ease, border-color .2s ease",
        }}>
      <IconButton type="button" aria-label="Search titles" onClick={() => {
            if (!isFocused)
                searchInputRef.current?.focus();
            else if (query.trim())
                navigate(`/search?query=${encodeURIComponent(query.trim())}`);
            else
                searchInputRef.current?.focus();
        }} color="inherit" size="small">
        <SearchIcon />
      </IconButton>
      <StyledInputBase inputRef={searchInputRef} placeholder="Titles, people, genres" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} inputProps={{
            "aria-label": "search",
        }} sx={{
            flex: 1,
            minWidth: 0,
            "& .NetflixInputBase-input": {
                width: "100%",
                py: 0.75,
                opacity: isFocused ? 1 : 0,
                transition: "opacity .15s ease",
            },
        }}/>
      </Search>
    </Box>);
}

import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/esm/Menu.js";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import { useLocation, useNavigate } from "react-router-dom";
import useOffSetTop from "src/hooks/useOffSetTop";
import { APP_BAR_HEIGHT } from "src/constant";
import Logo from "../Logo";
import SearchBox from "../SearchBox";
import NetflixNavigationLink from "../NetflixNavigationLink";
const pages = [
    { label: "Home", to: "/" },
    { label: "Series", to: "/series" },
    { label: "Movies", to: "/movies" },
];
const MainHeader = () => {
    const isOffset = useOffSetTop(APP_BAR_HEIGHT);
    const location = useLocation();
    const navigate = useNavigate();
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);
    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };
    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };
    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };
    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };
    return (<AppBar sx={{
            px: { xs: 2, sm: 4, md: 7.5 },
            height: APP_BAR_HEIGHT,
            backgroundImage: "none",
            bgcolor: isOffset ? "rgba(8, 8, 8, .98)" : "rgba(8, 8, 8, .88)",
            boxShadow: isOffset ? "0 8px 28px rgba(0,0,0,.28)" : 0,
            backdropFilter: "blur(16px)",
            transition: "background-color .25s ease, box-shadow .25s ease",
        }}>
      <Toolbar disableGutters>
        <Logo sx={{ mr: { xs: 2, sm: 4 }, mt: 0.5 }}/>

        <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
          <IconButton size="large" aria-label="Open navigation" aria-controls="menu-appbar" aria-haspopup="true" onClick={handleOpenNavMenu} color="inherit">
            <MenuIcon />
          </IconButton>
          <Menu id="menu-appbar" anchorEl={anchorElNav} anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
        }} keepMounted transformOrigin={{
            vertical: "top",
            horizontal: "left",
        }} open={Boolean(anchorElNav)} onClose={handleCloseNavMenu} sx={{
            display: { xs: "block", md: "none" },
        }}>
            {pages.map((page) => (<MenuItem key={page.to} onClick={() => { navigate(page.to); handleCloseNavMenu(); }}>
                <Typography textAlign="center">{page.label}</Typography>
              </MenuItem>))}
          </Menu>
        </Box>
        <Stack direction="row" spacing={3} sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
          {pages.map((page) => (<NetflixNavigationLink to={page.to} variant="subtitle1" key={page.to} onClick={handleCloseNavMenu} sx={{ fontWeight: location.pathname === page.to ? 700 : 400 }}>
              {page.label}
            </NetflixNavigationLink>))}
        </Stack>

        <Box sx={{ flexGrow: 0, display: "flex", gap: { xs: 1, sm: 2 } }}>
          <SearchBox />
          <Tooltip title="Open settings">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar alt="user_avatar" src="/avatar.png" variant="rounded"/>
            </IconButton>
          </Tooltip>
          <Menu sx={{ mt: "45px" }} id="avatar-menu" anchorEl={anchorElUser} anchorOrigin={{
            vertical: "top",
            horizontal: "right",
        }} keepMounted transformOrigin={{
            vertical: "top",
            horizontal: "right",
        }} open={Boolean(anchorElUser)} onClose={handleCloseUserMenu}>
            {["Account", "Logout"].map((setting) => (<MenuItem key={setting} onClick={handleCloseUserMenu}>
                <Typography textAlign="center">{setting}</Typography>
              </MenuItem>))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>);
};
export default MainHeader;

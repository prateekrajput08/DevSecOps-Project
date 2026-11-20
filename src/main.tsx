import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./CustomClassNameSetup";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";

import store from "./store";
import { extendedApi } from "./store/slices/configuration";
import palette from "./theme/palette";
import router from "./routes";
import MainLoadingScreen from "./components/MainLoadingScreen";

store.dispatch(extendedApi.endpoints.getConfiguration.initiate(undefined));

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <Provider store={store}>
    <React.StrictMode>
      <ThemeProvider
        theme={createTheme({
          palette,
          typography: {
            fontFamily: "'Space Grotesk', sans-serif",
            h2: {
              fontSize: "clamp(2.25rem, 4vw, 4.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            },
            h4: { fontWeight: 700, letterSpacing: "-0.025em" },
            h5: {
              fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.015em",
            },
            body1: { fontSize: "1rem", lineHeight: 1.6 },
          },
          components: {
            MuiButton: {
              styleOverrides: {
                root: {
                  transition:
                    "transform .16s ease, background-color .16s ease, box-shadow .16s ease",
                  "&:hover": {
                    transform: "scale(1.045)",
                    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                  },
                },
              },
            },
            MuiIconButton: {
              styleOverrides: {
                root: {
                  transition:
                    "transform .16s ease, background-color .16s ease, border-color .16s ease",
                  "&:hover": { transform: "scale(1.1)" },
                },
              },
            },
          },
        })}
      >
        <CssBaseline />
        <GlobalStyles
          styles={{
            "html, body": {
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            },
            "html::-webkit-scrollbar, body::-webkit-scrollbar": {
              display: "none",
            },
          }}
        />
        <RouterProvider
          router={router}
          fallbackElement={<MainLoadingScreen />}
        />
      </ThemeProvider>
    </React.StrictMode>
  </Provider>
);

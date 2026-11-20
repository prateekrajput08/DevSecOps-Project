import { KeyboardEvent, PointerEvent, PureComponent } from "react";

interface VideoItemWithHoverPureProps {
  src: string;
  title: string;
  isPoster: boolean;
  onClick: () => void;
}

export default class VideoItemWithHoverPure extends PureComponent<VideoItemWithHoverPureProps> {
  handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    const label = event.currentTarget.querySelector<HTMLElement>(
      ".thumbnail-title"
    );
    if (label) {
      label.style.opacity = "1";
      label.style.textShadow = "0 2px 10px rgba(0,0,0,.95)";
    }
  };

  handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    const label = event.currentTarget.querySelector<HTMLElement>(
      ".thumbnail-title"
    );
    if (label) label.style.opacity = "0";
  };

  handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.props.onClick();
    }
  };

  render() {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Show details for ${this.props.title}`}
        aria-haspopup="dialog"
        onClick={this.props.onClick}
        onKeyDown={this.handleKeyDown}
        onPointerEnter={this.handlePointerEnter}
        onPointerLeave={this.handlePointerLeave}
        onFocus={(event) => {
          event.currentTarget.style.outline = "2px solid #fff";
          event.currentTarget.style.outlineOffset = "3px";
        }}
        onBlur={(event) => {
          event.currentTarget.style.outline = "none";
        }}
        style={{
          zIndex: 9,
          cursor: "pointer",
          borderRadius: 8,
          width: "100%",
          position: "relative",
          paddingTop: this.props.isPoster ? "177.78%" : "56.25%",
        }}
      >
        <img
          src={this.props.src}
          alt={this.props.title}
          style={{
            top: 0,
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            width: "100%",
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,.3)",
          }}
        />
        <div
          className="thumbnail-title"
          style={{
            position: "absolute",
            inset: "48% 0 0",
            display: "flex",
            alignItems: "flex-end",
            padding: "10px 12px",
            borderRadius: "0 0 8px 8px",
            background: "linear-gradient(transparent, rgba(0,0,0,.88))",
            color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(12px, 1vw, 15px)",
            fontWeight: 600,
            opacity: 0,
            textShadow: "0 2px 10px rgba(0,0,0,.95)",
            transition: "opacity .18s ease",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {this.props.title}
        </div>
      </div>
    );
  }
}

import { PureComponent } from "react";
export default class VideoItemWithHoverPure extends PureComponent {
    state = { hovered: false };
    handleKeyDown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.props.onClick();
        }
    };
    render() {
        return (<div role="button" tabIndex={0} aria-label={`Show details for ${this.props.title}`} aria-haspopup="dialog" onClick={this.props.onClick} onKeyDown={this.handleKeyDown} onPointerEnter={() => this.setState({ hovered: true })} onPointerLeave={() => this.setState({ hovered: false })} onFocus={(event) => {
                this.setState({ hovered: true });
                event.currentTarget.style.outline = "2px solid #fff";
                event.currentTarget.style.outlineOffset = "3px";
            }} onBlur={(event) => {
                this.setState({ hovered: false });
                event.currentTarget.style.outline = "none";
            }} style={{
                zIndex: 9,
                cursor: "pointer",
                borderRadius: 8,
                width: "100%",
                position: "relative",
                paddingTop: "60%",
                overflow: "hidden",
            }}>
        {this.props.src && <img src={this.props.src} alt={this.props.title} style={{
                    top: 0,
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    width: "100%",
                    borderRadius: 8,
                    boxShadow: this.state.hovered ? "0 12px 30px rgba(0,0,0,.7)" : "none",
                    transition: "box-shadow .2s ease",
                }}/>}
        <div className="thumbnail-title" style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                display: "block",
                padding: "24px 10px 9px",
                background: this.state.hovered ? "linear-gradient(transparent, rgba(0,0,0,.82))" : "transparent",
                color: "#fff",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(12px, 1vw, 15px)",
                fontWeight: 600,
                opacity: this.state.hovered ? 1 : 0,
                textShadow: this.state.hovered ? "0 2px 12px rgba(0,0,0,.95)" : "none",
                transition: "opacity .18s ease, text-shadow .18s ease, background .18s ease",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                pointerEvents: "none",
            }}>
          {this.props.title}
        </div>
      </div>);
    }
}

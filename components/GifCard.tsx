import React from "react";
import { Download } from "lucide-react";
import { getCat, type Gif } from "@/lib/gifMeta";
import { GifMedia } from "@/components/GifMedia";

export function GifCard({
  gif, onOpen, onDownload,
}: {
  gif: Gif;
  onOpen: (g: Gif) => void;
  onDownload?: (g: Gif, e: React.MouseEvent) => void;
}) {
  const meta = getCat(gif.category);
  const url = gif.firebaseUrl || gif.url;

  return (
    <div className="gifCard" onClick={() => onOpen(gif)}>
      <div className="gifThumbWrap">
        <GifMedia url={url} name={gif.name} />
        {onDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(gif, e); }}
            className="gifDlBtn"
            title="Download"
          >
            <Download size={13} style={{ color: "#fff" }} />
          </button>
        )}
      </div>
      <div className="gifInfo">
        <span className="gifName">{gif.name}</span>
        <div className="gifCat" style={{ color: meta.color }}>
          <span>{meta.emoji}</span>
          <span>{gif.category}</span>
        </div>
      </div>
    </div>
  );
}

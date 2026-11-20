import { useEffect, useState } from "react";
// import { buildThresholdList } from "src/utils";
export default function useIntersectionObserver(ref, options) {
    const [entry, setEntry] = useState(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setEntry(entry);
        }, options ?? {
            root: null,
            rootMargin: "0px",
            // threshold: buildThresholdList(),
            threshold: 1,
        });
        if (ref.current) {
            observer.observe(ref.current);
        }
        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);
    return entry;
}

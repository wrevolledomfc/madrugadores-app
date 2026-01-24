export function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    window[cb] = (data) => {
      delete window[cb];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cb}`;
    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject(new Error("JSONP error"));
    };

    document.body.appendChild(script);
  });
}

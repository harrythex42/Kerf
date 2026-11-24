const previous = '/Unsliced/';
const next = new URL('https://harrythex42.github.io/unsliced-web/');
if (location.pathname.startsWith(previous)) next.pathname += location.pathname.slice(previous.length);
next.search = location.search;
next.hash = location.hash;
location.replace(next.href);

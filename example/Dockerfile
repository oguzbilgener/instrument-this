
FROM node:14-alpine as base
RUN mkdir /instrument-this
ADD . /instrument-this

WORKDIR /instrument-this
RUN npm i
RUN npm run build

WORKDIR /instrument-this/example
RUN npm i
RUN npm run build

FROM node:14-alpine
RUN apk --no-cache add tini

RUN mkdir /instrument-this

WORKDIR /instrument-this
COPY --from=base /instrument-this/build /instrument-this/build
COPY --from=base /instrument-this/package.json /instrument-this/package.json
COPY --from=base /instrument-this/package-lock.json /instrument-this/package-lock.json

COPY --from=base /instrument-this/example/build /instrument-this/example/build
COPY --from=base /instrument-this/example/package.json /instrument-this/example/package.json
COPY --from=base /instrument-this/example/package-lock.json /instrument-this/example/package-lock.json

RUN npm ci --only=production

WORKDIR /instrument-this/example

RUN npm ci --only=production

WORKDIR /instrument-this

RUN rm -rf .npmrc ~/.npm ~/.cache

EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "example/build/index.js"]
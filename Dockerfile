FROM node:16.20.2-alpine

USER root

ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /chmodtimer

COPY . .

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache tzdata dumb-init && \
    echo 'if [ -n "$TZ" ]; then' >> /etc/profile && \
    echo '  export TZ=$TZ' >> /etc/profile && \
    echo "fi" >> /etc/profile && \
    npm install -g pnpm --registry=$NPM_REGISTRY && \
    pnpm install --registry=$NPM_REGISTRY

CMD ["dumb-init", "pnpm", "run", "start"]

# docker buildx build --platform linux/amd64,linux/arm64 --load --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t keenghost/chmodtimer:latest .
# docker run -d --name chmodtimer -e TZ=Asia/Shanghai -v /chmodtest:/chmodtest -v path/to/config.yaml:/chmodtimer/config/config.yaml keenghost/chmodtimer:latest

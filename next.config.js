module.exports = {

    async redirects() {
      return [
        {
          source: '/about',
          destination: 'https://google.com/about',
          permanent: false
        }
      ];
    }
  };
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx)$",
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom", "./jest.setup.js"],
};

import type { FunctionComponent, ReactNode } from 'react';
import { useContext } from 'react';

import { Footer, Header, Wrapper } from './components';
import { GlobalStyle } from './config/theme';
import { ToggleThemeContext } from './Root';

export type AppProps = {
  children: ReactNode;
};

export const App: FunctionComponent<AppProps> = ({ children }) => {
  const toggleTheme = useContext(ToggleThemeContext);

  return (
    <>
      <GlobalStyle />
      <Wrapper>
        <Header handleToggleClick={toggleTheme} />
        {children}
        <Footer />
      </Wrapper>
    </>
  );
};

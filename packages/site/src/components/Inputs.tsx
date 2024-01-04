import styled from 'styled-components';

export const TextArea = styled.textarea`
  width: 100%;
  height: 100px;
  border-radius: ${(props) => props.theme.radii.default};
  border: 1px solid ${(props) => props.theme.colors.border?.default};
  padding: 1rem;
  font-size: ${(props) => props.theme.fontSizes.small};
  resize: none;
  box-sizing: border-box;
  margin-bottom: 1.2rem;
`;

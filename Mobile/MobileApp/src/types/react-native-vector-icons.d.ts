declare module 'react-native-vector-icons/*' {
  import { Component } from 'react';
  import { TextProps, StyleProp, TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  export default class Icon extends Component<IconProps & TextProps> {}
}

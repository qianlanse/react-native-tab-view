/* @flow */

import { Animated } from 'react-native';

export type Route = {
  title?: string;
  key: string;
}

export type NavigationState = {
  index: number;
  routes: Array<Route>;
}

export type Scene = {
  route: Route;
  focused: boolean;
  index: number;
}

export type SceneRendererProps = {
  layout: {
    measured: boolean;
    height: number;
    width: number;
  };
  navigationState: NavigationState;
  position: Animated.Value;
  jumpToIndex: (index: number) => void;
  getLastPosition: () => number;
}

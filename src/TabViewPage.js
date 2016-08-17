/* @flow */

import React, { Component, PropTypes } from 'react';
import {
  Animated,
  InteractionManager,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import shallowCompare from 'react-addons-shallow-compare';
import TabViewPanResponder from './TabViewPanResponder';
import TabViewStyleInterpolator from './TabViewStyleInterpolator';
import { SceneRendererPropType } from './TabViewPropTypes';
import type { Route, Scene, SceneRendererProps } from './TabViewTypeDefinitions';

type Props = SceneRendererProps & {
  route: Route;
  renderScene: (scene: Scene) => ?React.Element<any>;
  panHandlers?: any;
  style?: any;
}

type State = {
  panResponder: any;
}

export default class TabViewPage extends Component<void, Props, State> {
  static propTypes = {
    ...SceneRendererPropType,
    renderScene: PropTypes.func.isRequired,
    panHandlers: PropTypes.object,
    style: PropTypes.any,
  };

  static PanResponder = TabViewPanResponder;
  static StyleInterpolator = TabViewStyleInterpolator;

  state: State = {
    panResponder: null,
  };

  componentWillMount() {
    this._updatePanHandlers(this.props);
  }

  componentWillReceiveProps(nextProps: Props) {
    this._updatePanHandlers(nextProps);
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return shallowCompare(this, nextProps, nextState);
  }

  _updatePanHandlers = (props: Props) => {
    const { panResponder } = this.state;
    if (panResponder) {
      // If we update the panHandlers mid-gesture, it'll never release the InteractionManager handle
      // Which will cause InteractionManager.runAfterInteractions callbacks to never fire
      // So we need to manually release the handle
      const handle = panResponder.getInteractionHandle();
      if (handle) {
        InteractionManager.clearInteractionHandle(handle);
      }
    }
    const { panHandlers } = props;
    const viewPanHandlers = typeof panHandlers !== 'undefined' ? panHandlers : TabViewPanResponder.forHorizontal(props);
    this.setState({
      panResponder: viewPanHandlers ? PanResponder.create(viewPanHandlers) : null,
    });
  };

  render() {
    const { navigationState, renderScene, style, route } = this.props;
    const { routes, index } = navigationState;

    const viewStyle = typeof style !== 'undefined' ? style : TabViewStyleInterpolator.forHorizontal(this.props);
    const scene = {
      route,
      focused: index === routes.indexOf(route),
      index: routes.indexOf(route),
    };

    return (
      <Animated.View style={[ StyleSheet.absoluteFill, viewStyle ]} {...(this.state.panResponder ? this.state.panResponder.panHandlers : null)}>
        {renderScene(scene)}
      </Animated.View>
    );
  }
}

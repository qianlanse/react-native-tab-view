/* @flow */

import React, { Component, PropTypes } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  PanResponder,
  Platform,
} from 'react-native';
import TouchableItem from './TouchableItem';
import { SceneRendererPropType } from './TabViewPropTypes';
import type { Scene, SceneRendererProps } from './TabViewTypeDefinitions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabbar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    backgroundColor: 'black',
    elevation: 4,
  },
  tablabel: {
    color: 'white',
    fontSize: 12,
    margin: 4,
  },
  tab: {
    flex: 1,
  },
  tabitem: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});

type IndicatorProps = SceneRendererProps & {
  width: number;
}

type DefaultProps = {
  renderLabel: (scene: Scene) => ?React.Element<any>;
}

type Props = SceneRendererProps & {
  scrollable?: boolean;
  pressColor?: string;
  renderLabel?: (scene: Scene) => ?React.Element<any>;
  renderIcon?: (scene: Scene) => ?React.Element<any>;
  renderBadge?: (scene: Scene) => ?React.Element<any>;
  renderIndicator?: (props: IndicatorProps) => ?React.Element<any>;
  onTabItemPress?: Function;
  tabStyle?: any;
  style?: any;
}

type State = {
  scroll: Animated.Value;
}

export default class TabBar extends Component<DefaultProps, Props, State> {
  static propTypes = {
    ...SceneRendererPropType,
    scrollEnabled: PropTypes.bool,
    pressColor: TouchableItem.propTypes.pressColor,
    renderIcon: PropTypes.func,
    renderLabel: PropTypes.func,
    renderIndicator: PropTypes.func,
    onTabItemPress: PropTypes.func,
    tabStyle: View.propTypes.style,
    style: View.propTypes.style,
  };

  static defaultProps = {
    renderLabel: ({ route }) => route.title ? <Text style={styles.tablabel}>{route.title}</Text> : null,
  };

  state: State = {
    scroll: new Animated.Value(0),
  };

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: this._shouldCaptureResponder,
      onMoveShouldSetPanResponderCapture: this._shouldCaptureResponder,
      onPanResponderGrant: () => {
        this.state.scroll.stopAnimation(value => {
          this.state.scroll.setOffset(value);
          this.state.scroll.setValue(0);
        });
      },
      onPanResponderMove: Animated.event([ null, { dx: this.state.scroll } ]),
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: this._releaseResponder,
      onPanResponderTerminate: this._releaseResponder,
    });
  }

  componentDidUpdate() {
    this._resetScroll();
  }

  _shouldCaptureResponder = (event, gestureState) => {
    return this._isScrollEnabled() && (
      (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) &&
      (Math.abs(gestureState.vx) > Math.abs(gestureState.vy))
    );
  };

  _releaseResponder = (event, gestureState) => {
    Animated.decay(this.state.scroll, {
      velocity: gestureState.vx * (Platform.OS === 'android' ? 1000000 : 1),
    }).start();
  }

  _resetScroll = () => {
    this.state.scroll.flattenOffset(0);
    Animated.spring(this.state.scroll, {
      toValue: 0,
      tension: 300,
      friction: 35,
    }).start();
  };

  _isScrollEnabled = () => {
    const { scrollEnabled, navigationState } = this.props;
    const { routes } = navigationState;

    return scrollEnabled !== false && routes.length > 3;
  };

  _getTabItemWidth = () => {
    const { layout } = this.props;
    const tabItemWidth = (layout.width / 5) * 2;
    return tabItemWidth;
  };

  _getMaxDistance = () => {
    const tabItemWidth = this._getTabItemWidth();
    const { layout, navigationState } = this.props;
    const maxDistance = (tabItemWidth * navigationState.routes.length) - layout.width;
    return maxDistance;
  };

  render() {
    const { position, layout, navigationState } = this.props;
    const { routes, index } = navigationState;
    const tabItemWidth = (layout.width / 5) * 2;
    const tabBarWidth = tabItemWidth * routes.length;
    const scrollEnabled = this._isScrollEnabled();
    const maxDistance = this._getMaxDistance();

    const inputRange = routes.map((x, i) => i);

    const translateOutputRange = inputRange.map(i => {
      const centerDistance = (tabItemWidth * i) + (tabItemWidth / 2);
      const scrollAmount = centerDistance - (layout.width / 2);

      if (scrollAmount < 0) {
        return 0;
      }

      if (scrollAmount > maxDistance) {
        return -maxDistance;
      }

      return -scrollAmount;
    });

    const translateX = Animated.add(
      position.interpolate({
        inputRange,
        outputRange: translateOutputRange,
      }),
      this.state.scroll
    ).interpolate({
      inputRange: [ -maxDistance, 0 ],
      outputRange: [ -maxDistance, 0 ],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        {...this._panResponder.panHandlers}
        style={[ styles.tabbar, scrollEnabled ? { width: tabBarWidth, transform: [ { translateX } ] } : null, this.props.style ]}
      >
        {routes.map((route, i) => {
          const focused = index === i;
          const outputRange = inputRange.map(inputIndex => inputIndex === i ? 1 : 0.7);
          const opacity = position.interpolate({
            inputRange,
            outputRange,
          });
          const scene = {
            route,
            focused,
            index: i,
          };
          const icon = this.props.renderIcon ? this.props.renderIcon(scene) : null;
          const label = this.props.renderLabel ? this.props.renderLabel(scene) : null;
          const badge = this.props.renderBadge ? this.props.renderBadge(scene) : null;

          const tabStyle = {};

          if (icon) {
            if (label) {
              tabStyle.marginTop = 8;
            } else {
              tabStyle.margin = 8;
            }
          }

          if (scrollEnabled) {
            tabStyle.width = tabItemWidth;
          }

          return (
            <TouchableItem
              key={route.key}
              style={styles.tab}
              pressColor={this.props.pressColor}
              delayPressIn={scrollEnabled ? undefined : 0} // eslint-disable-line no-undefined
              onPress={() => {
                const { onTabItemPress, jumpToIndex } = this.props;
                this._resetScroll();
                jumpToIndex(i);
                if (onTabItemPress) {
                  onTabItemPress(routes[i]);
                }
              }}
            >
              <View style={styles.container}>
                <Animated.View style={[ styles.tabitem, { opacity }, tabStyle, this.props.tabStyle ]}>
                  {icon}
                  {label}
                </Animated.View>
                {badge ?
                  <View style={styles.badge}>
                    {badge}
                  </View> : null
                }
              </View>
            </TouchableItem>
          );
        })}
        {this.props.renderIndicator ?
          this.props.renderIndicator({
            ...this.props,
            width: scrollEnabled ? tabItemWidth : layout.width / routes.length,
          }) :
          null
        }
      </Animated.View>
    );
  }
}

/* @flow */

import React, { Component, PropTypes } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import TouchableItem from './TouchableItem';
import { SceneRendererPropType } from './TabViewPropTypes';
import type { Scene, SceneRendererProps } from './TabViewTypeDefinitions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabbar: {
    backgroundColor: 'black',
    elevation: 4,
  },
  tabcontent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
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

export default class TabBar extends Component<DefaultProps, Props, void> {
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

  componentDidMount() {
    this._positionListener = this.props.position.addListener(this._adjustScroll);
  }

  componentWillUnmount() {
    this.props.position.removeListener(this._positionListener);
  }

  componentDidReceiveProps(nextProps) {
    this._handleChangeTab(nextProps.navigationState.index);
  }

  _scrollLock: boolean = false;

  _isScrollEnabled = () => {
    const { scrollEnabled, navigationState } = this.props;
    const { routes } = navigationState;

    return scrollEnabled !== false && routes.length > 3;
  };

  _getTabItemWidth = () => {
    const { layout } = this.props;

    return (layout.width / 5) * 2;
  };

  _getScrollAmount = (value: number) => {
    const { layout, navigationState } = this.props;
    const tabItemWidth = this._getTabItemWidth();
    const maxDistance = (tabItemWidth * navigationState.routes.length) - layout.width;
    const centerDistance = (tabItemWidth * value) + (tabItemWidth / 2);
    const scrollAmount = centerDistance - (layout.width / 2);

    if (scrollAmount < 0) {
      return 0;
    }

    if (scrollAmount > maxDistance) {
      return maxDistance;
    }

    return scrollAmount;
  };

  _adjustScroll = (e: { value: number }) => {
    if (this._scrollLock || !this._isScrollEnabled()) {
      return;
    }

    const scrollAmount = this._getScrollAmount(e.value);
    this._scrollTo(scrollAmount, false);
  };

  _scrollTo = (x: number, animated) => {
    return new Promise(resolve => {
      this._pendingScrollCallback = {
        x,
        cb: () => global.requestAnimationFrame(resolve),
      };
      this._scrollView.scrollTo({ x, animated: !!animated });
    });
  };

  _handleScroll = (e: any) => {
    if (this._pendingScrollCallback && this._pendingScrollCallback.x === e.nativeEvent.contentOffset.x) {
      this._pendingScrollCallback.cb();
      this._pendingScrollCallback = null;
    }
  };

  _handleChangeTab = async (i: number) => {
    if (this.props.navigationState.index === i || !this._isScrollEnabled()) {
      return;
    }
    this._scrollLock = true;
    try {
      const scrollAmount = this._getScrollAmount(i);
      await this._scrollTo(scrollAmount, true);
    } finally {
      this._scrollLock = false;
    }
  };

  _setRef = el => (this._scrollView = el);

  render() {
    const { position, layout } = this.props;
    const { routes, index } = this.props.navigationState;
    const scrollEnabled = this._isScrollEnabled();
    const tabItemWidth = (layout.width / 5) * 2;

    const inputRange = routes.map((x, i) => i);

    return (
      <View style={[ styles.tabbar, this.props.style ]}>
        <ScrollView
          horizontal
          scrollEnabled={scrollEnabled}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[ styles.tabcontent, scrollEnabled ? null : { flex: 1 } ]}
          onScroll={this._handleScroll}
          scrollEventThrottle={16}
          ref={this._setRef}
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
                onPress={() => {
                  const { onTabItemPress, jumpToIndex } = this.props;
                  this._handleChangeTab(i);
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
        </ScrollView>
      </View>
    );
  }
}

import PropTypes from 'prop-types';
import React from 'react';

import DraggableDiv from './DraggableDiv';
import TrackArea from './TrackArea';

import { isWithin } from './utils';


const checkMousePosVsEl = (x, y, el) => {
  const bBox = el.getBoundingClientRect();
  return isWithin(
    x, y, bBox.left, bBox.left + bBox.width, bBox.top, bBox.top + bBox.height
  );
};

class MoveableTrack extends TrackArea {
  constructor(props) {
    super(props);

    this.moveable = true;
  }

  render() {
    return (
      <div
        ref={(r) => { this.el = r; }}
        className={this.props.className}
        onMouseEnter={this.handleMouseEnter.bind(this)}
        onMouseLeave={(e) => {
          if (checkMousePosVsEl(
            e.nativeEvent.clientX, e.nativeEvent.clientY, this.el
          )) return;
          this.handleMouseLeave();
        }}
        style={{
          height: this.props.height,
          width: this.props.width,
        }}
      >
        <DraggableDiv
          height={this.props.height}
          key={this.props.uid}
          resizeHandles={this.props.editable ?
            this.props.resizeHandles : new Set()
          }
          sizeChanged={stuff =>
            this.props.handleResizeTrack(
              this.props.uid,
              stuff.width,
              stuff.height,
            )
          }
          style={{ background: 'transparent' }}
          uid={this.props.uid}
          width={this.props.width}
        />
        {this.props.editable && (
          this.getControls(this.state.controlsVisible || this.props.item.configMenuVisible)
        )}
      </div>
    );
  }
}

MoveableTrack.propTypes = {
  className: PropTypes.string,
  uid: PropTypes.string,
  item: PropTypes.object,
  height: PropTypes.number,
  width: PropTypes.number,
};

export default MoveableTrack;

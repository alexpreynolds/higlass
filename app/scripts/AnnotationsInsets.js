import rbush from 'rbush';

// Services
import { pubSub } from './services';

// Utils
import { positionLabels } from './utils';

class AnnotationsInsets {
  constructor(insetsTrack, options, getTrackByUid, animate) {
    this.getTrackByUid = getTrackByUid;
    this.animate = animate;
    this.options = options;

    this.insetsTrack = getTrackByUid(insetsTrack);

    if (!this.insetsTrack) {
      console.warn(`Insets track (uid: ${insetsTrack}) not found`);
      return;
    }

    this.insetsTrack.subscribe('zoom', this.zoomHandler.bind(this));

    this.annotationTrackIds = new Set();
    this.annotationTracks = options.annotationTracks
      .map((uid) => {
        const track = getTrackByUid(uid);

        if (!track) console.warn(`Child track (uid: ${uid}) not found`);
        else this.annotationTrackIds.add(track.uuid);

        return track;
      })
      .filter(track => track);

    // Augment annotation tracks
    this.annotationTracks.forEach((track) => {
      track.subscribe('annotationDrawn', this.annotationDrawnHandler.bind(this));
    });

    this.currK = 1;  // Current scale
    this.drawnAnnoIdx = new Set();
    this.insets = {};

    this.initTree();

    this.pubSubs = [];
    this.pubSubs.push(
      pubSub.subscribe('TiledPixiTrack.tilesDrawn', this.tilesDrawnHandler.bind(this))
    );
  }

  /**
   * Handles annotation drawn events
   *
   * @param  {String}  event.uid  UID of the view that triggered the event.
   * @param  {Array}  event.viewPos  View position (i.e., [x, y, width, height])
   *   of the drawn annotation.
   * @param  {Array}  event.dataPos  Data position of the drawn annotation.
   */
  annotationDrawnHandler({ uid, viewPos, dataPos }) {
    const locus = {
      uid,
      minX: viewPos[0],
      minY: viewPos[1],
      maxX: viewPos[0] + viewPos[2],
      maxY: viewPos[1] + viewPos[3],
      cX1: dataPos[0],
      cX2: dataPos[1],
      cY1: dataPos[2],
      cY2: dataPos[3]
    };

    this.newAnno = !this.drawnAnnoIdxOld.has(uid);
    this.drawnAnnoIdx.add(uid);

    if (
      viewPos[2] <= this.options.insetThreshold ||
      viewPos[3] <= this.options.insetThreshold
    ) {
      this.insetsToBeDrawn.push(locus);
      this.insetsToBeDrawnIds.add(uid);
    } else {
      this.drawnAnnotations.push(locus);
    }
  }

  /**
   * Build region tree of drawn annotations and trigger the creation of insets.
   */
  buildTree() {
    if (!this.drawnAnnotations.length) return;

    this.drawnAnnotations = [
      ...this.insetsToBeDrawn,
      ...this.drawnAnnotations
    ];
    if (this.newAnno) this.tree.load(this.drawnAnnotations);
    this.createInsets();
  }

  /**
   * Create insets.
   */
  createInsets() {
    this.drawInsets(this.positionInsets(), this.insetsToBeDrawnIds);
  }

  /**
   * Draw positioned insets
   *
   * @param  {Array}  insets  Inset positions to be drawn.
   * @param  {Set}  insetIds  Inset IDs to be drawn.
   * @return  {Object}  Promise resolving once all insets are drawn.
   */
  drawInsets(insets, insetIds) {
    return Promise.all(this.insetsTrack.drawInsets(insets, insetIds))
      .then(() => { this.animate(); })
      .catch((e) => { this.animate(); console.error(e); });
  }

  /**
   * Initialize annotation RTree
   */
  initTree() {
    this.tree = rbush();
    this.oldAnnotations = this.drawnAnnotations;
    this.drawnAnnotations = [];
    this.oldInsets = this.insetsToBeDrawn;
    this.insetsToBeDrawn = [];
    this.insetsToBeDrawnIds = new Set();
    this.drawnAnnoIdxOld = this.drawnAnnoIdx;
    this.drawnAnnoIdx = new Set();
    this.numTracksDrawn = 0;
    this.newAnno = false;
  }

  /**
   * Position insets using simulated annealing
   *
   * @return  {Array}  Position and dimension of the insets.
   */
  positionInsets() {
    if (!this.insetsToBeDrawn.length) return [];

    const anchors = this.drawnAnnotations.map(obj => ({
      t: 1,
      x: (obj.maxX + obj.minX) / 2,
      y: (obj.maxY + obj.minY) / 2,
      ox: (obj.maxX + obj.minX) / 2,  // Origin x
      oy: (obj.maxY + obj.minY) / 2,  // Origin y
      wh: (obj.maxX - obj.minX) / 2,  // Width half
      hh: (obj.maxY - obj.minY) / 2,  // Heigth half
      ...obj
    }));

    const insets = this.insetsToBeDrawn
      .map((inset) => {
        if (!this.insets[inset.uid]) {
          // Add new inset
          this.insets[inset.uid] = {
            t: 1.0,
            x: (inset.maxX + inset.minX) / 2,
            y: (inset.maxY + inset.minY) / 2,
            ox: (inset.maxX + inset.minX) / 2,  // Origin x
            oy: (inset.maxY + inset.minY) / 2,  // Origin y
            width: 64,
            height: 64,
            wh: 32,  // Width half
            hh: 32,  // Heigth half
            ...inset
          };
        } else {
          // Update existing inset positions
          const newOx = (inset.maxX + inset.minX) / 2;
          const newOy = (inset.maxY + inset.minY) / 2;
          const dX = this.insets[inset.uid].ox - newOx;
          const dY = this.insets[inset.uid].oy - newOy;

          this.insets[inset.uid].ox = newOx;
          this.insets[inset.uid].oy = newOy;

          this.insets[inset.uid].x -= dX;
          this.insets[inset.uid].y -= dY;

          this.insets[inset.uid].t = this.scaleChanged ? 0.5 : 0;
        }

        return this.insets[inset.uid];
      });

    const insetsToBePositioned = insets
      .filter((inset) => {
        if (inset.t) return true;

        // Inset has cooled down (i.e., is already positions), hence, it is
        // filtered out and added to anchors instead.
        anchors.push(inset);
        return false;
      });

    if (insetsToBePositioned.length) {
      const t0 = performance.now();

      positionLabels
        // Insets, i.e., labels
        .label(insetsToBePositioned)
        // Anchors, i.e., label origins, already positioned labels, and other
        // annotations
        .anchor(anchors)
        .width(this.insetsTrack.dimensions[0])
        .height(this.insetsTrack.dimensions[1])
        .start(Math.max(2, Math.min(100 / insetsToBePositioned.length)));

      console.log(`Labeling took ${performance.now() - t0} msec`);
    }

    const pos = insets.map(inset => ([
      inset.uid,
      inset.x,
      inset.y,
      inset.width,
      inset.height,
      inset.ox,
      inset.oy,
      inset.cX1,
      inset.cX2,
      inset.cY1,
      inset.cY2
    ]));

    return pos;
  }

  /**
   * Remove this track.
   */
  remove() {
    this.pubSubs.forEach(sub => pubSub.unsubscribe(sub));
    this.pubSubs = undefined;
    this.annotationTracks.forEach((track) => {
      track.unsubscribe('annotationDrawn', this.annotationDrawnHandler.bind(this));
    });
  }

  /**
   * Callback function passed into the annotation tracks to trigger tree
   * building of the spatial RTree.
   *
   * @description
   * Simple counter that call `this.buildTree()` once the number of annotation
   * tracks is reached. This might need to be improved!=
   */
  tilesDrawnHandler({ uuid }) {
    if (!this.annotationTrackIds.has(uuid)) return;

    this.numTracksDrawn += 1;
    if (!(this.numTracksDrawn % this.annotationTracks.length)) this.buildTree();
  }

  zoomHandler({ k }) {
    this.initTree();

    this.scaleChanged = this.currK !== k;
    this.currK = k;
  }
}

export default AnnotationsInsets;
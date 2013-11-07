/**
 * Created with JetBrains PhpStorm.
 * User: Beniamin
 * Date: 22.02.13
 * Time: 21:09
 * To change this template use File | Settings | File Templates.
 */

var blocksApp = angular.module('blocksApp', []);

blocksApp.value('colors', {
    'enemy'         :   '#FF0000',
    'lblock'        :   '#00FF00',
    'gblock'        :   '#0000FF',
    'enemy_emitter' :   '#FF00FF'
});

blocksApp.value('cnf', {
    board_x_shapes  : 40,
    board_y_shapes  : 40,
    perspective_x_shapes  : 20,
    perspective_y_shapes  : 20,
    shape_size      : 50,
    lives           : 50,
    enemy_emitters  : 3
});

function BlocksCtrl($scope, $filter, $timeout, colors, cnf) {

    $scope.i = -cnf.shape_size;
    $scope.selected = null;
    $scope.shapes   = [];
    $scope.shapes_indexes   = {
        by_x: {},
        by_y: {}
    };
    $scope.colors = [colors['enemy'], colors['lblock'], colors['gblock']];
    $scope.score = 0;
    $scope.lives = cnf.lives;
    $scope.dead = 0;
    $scope.enemy_emitters_indexes = [];

    $scope.gblocks = 0;
    $scope.lblocks = 0;
    $scope.block_has_been_put = false;

    $scope.board_x = 0;
    $scope.board_y = 0;

    function buildShape () {
        return {
            color   : typeof arguments[0] != 'undefined' ? arguments[0] : $scope.colors[Math.floor(1 + Math.random() + Math.random())],
            x       : typeof arguments[1] != 'undefined' ? arguments[1] : $scope.i % (cnf.shape_size * cnf.board_x_shapes),
            y       : typeof arguments[2] != 'undefined' ? arguments[2] : Math.floor($scope.i / (cnf.shape_size * cnf.board_y_shapes)) * cnf.shape_size,
            hidden  : 0,
            damaged : 0
        };
    };

    $scope.buildIndexes = function () {
        for(var i = 0, x, y; i < $scope.shapes.length; i++) {
            x = $scope.shapes[i].x;
            y = $scope.shapes[i].y;

            if(typeof $scope.shapes_indexes.by_x[x] == 'undefined') {
                $scope.shapes_indexes.by_x[x] = {};
            }
            $scope.shapes_indexes.by_x[x][y] = i;

            if(typeof $scope.shapes_indexes.by_y[y] == 'undefined') {
                $scope.shapes_indexes.by_y[y] = {};
            }
            $scope.shapes_indexes.by_y[y][x] = i;
        }
    };

    $scope.addIndex = function (x, y, i) {
        if(typeof $scope.shapes_indexes.by_x[x] == 'undefined') {
            $scope.shapes_indexes.by_x[x] = {};
        }
        $scope.shapes_indexes.by_x[x][y] = i;

        if(typeof $scope.shapes_indexes.by_y[y] == 'undefined') {
            $scope.shapes_indexes.by_y[y] = {};
        }
        $scope.shapes_indexes.by_y[y][x] = i;
    };

    $scope.deleteIndex = function (x, y) {
        if(typeof $scope.shapes_indexes.by_x[x] != 'undefined' &&
                typeof $scope.shapes_indexes.by_x[x][y] != 'undefined') {
            delete $scope.shapes_indexes.by_x[x][y];
        }

        if(typeof $scope.shapes_indexes.by_y[y] != 'undefined' &&
                typeof $scope.shapes_indexes.by_y[y][x] != 'undefined') {
            delete $scope.shapes_indexes.by_y[y][x];
        }
    };

    jQuery('body').bind('keydown', function(event) {
        if($scope.selected == null || $scope.dead) {
            return true;
        }
        if(event.keyCode == 37) {
            $scope.move(-1, 0);
            event.preventDefault();
            return false;
        }
        if(event.keyCode == 38) {
            $scope.move(0, -1);
            event.preventDefault();
            return false;
        }
        if(event.keyCode == 39) {
            $scope.move(1, 0);
            event.preventDefault();
            return false;
        }
        if(event.keyCode == 40) {
            $scope.move(0, 1);
            event.preventDefault();
            return false;
        }
        if(event.keyCode == 32) {
            $scope.put_block();
            event.preventDefault();
            return false;
        }
    });

    $scope.clicked = function(shape) {
        if($scope.selected == null && shape.color != colors['enemy']) {
            $scope.selected = shape;
        }
    };

    $scope.put_block = function() {
        if($scope.gblocks > 0 && !$scope.block_has_been_put) {
            $scope.block_has_been_put = true;
            $scope.gblocks--;
        }
    };

    $scope.move = function(x, y) {
        var new_x = $scope.selected.x + x * cnf.shape_size;
        var new_y = $scope.selected.y + y * cnf.shape_size;
        var update = true;
        if($scope.block_has_been_put) {
            $scope.block_has_been_put = false;
            $scope.shapes.push( buildShape(colors['gblock'], $scope.selected.x, $scope.selected.y) );
            $scope.addIndex($scope.selected.x, $scope.selected.y, $scope.shapes.length - 1);
            update = false;
        }
        if($scope.check_bounds(new_x, new_y)) {
            $scope.change_perspective(x, y);
            $scope.move_others();
            $scope.check_matching(new_x, new_y);
            if(update) {
                $scope.update_indexes($scope.selected.x, $scope.selected.y, new_x, new_y);
            }
            $scope.selected.x = new_x;
            $scope.selected.y = new_y;
        }
        if($scope.enemy_emitters_indexes.length) {
            for(var i = 0; i < $scope.enemy_emitters_indexes.length; i++) {
                $scope.try_to_emit_enemy($scope.shapes[$scope.enemy_emitters_indexes[i]]);
            }
        }
        $scope.$apply();
    };

    $scope.change_perspective = function(x, y) {
        if(x < 0 && $scope.board_x < 0 && $scope.selected.x + $scope.board_x < cnf.shape_size * 5) {
            $scope.board_x += cnf.shape_size;
        }
        if(y < 0 && $scope.board_y < 0 && $scope.selected.y + $scope.board_y < cnf.shape_size * 5) {
            $scope.board_y += cnf.shape_size;
        }

        if(x > 0 && $scope.board_x > (cnf.perspective_x_shapes - cnf.board_x_shapes) * cnf.shape_size && $scope.board_x + $scope.selected.x > (cnf.perspective_x_shapes - 5) * cnf.shape_size) {
            $scope.board_x -= cnf.shape_size;
        }
        if(y > 0 && $scope.board_y > (cnf.perspective_y_shapes - cnf.board_y_shapes) * cnf.shape_size && $scope.board_y + $scope.selected.y > (cnf.perspective_y_shapes - 5) * cnf.shape_size) {
            $scope.board_y -= cnf.shape_size;
        }
    };

    $scope.move_others = function() {
        for(var i = 0; i < $scope.shapes.length; i++) {
            if($scope.shapes[i].hidden == 0 && $scope.shapes[i].color == colors['enemy']) {
                var dir = Math.round(Math.random()) * 2 - 1;
                if(Math.round(Math.random())) {
                    var new_x = $scope.shapes[i].x + cnf.shape_size * dir;
                    var y = $scope.shapes[i].y;
                    if($scope.check_bounds(new_x, y)) {
                        var replacement_idx = $scope.shapes_indexes.by_x[new_x][y];
                        if($scope.shapes[replacement_idx] != $scope.selected) {
                            if(typeof replacement_idx != 'undefined' &&
                                typeof $scope.shapes[replacement_idx] != 'undefined') {
                                if($scope.shapes[replacement_idx].color == colors['gblock'] ||
                                    $scope.shapes[replacement_idx].color == colors['enemy_emitter']) {
                                    continue;
                                }
                                $scope.shapes[replacement_idx].x = $scope.shapes[i].x;
                            }
                            $scope.update_indexes($scope.shapes[i].x, $scope.shapes[i].y, new_x, y);
                            $scope.shapes[i].x = new_x;
                        }
                    }
                } else {
                    var x = $scope.shapes[i].x;
                    var new_y = $scope.shapes[i].y + cnf.shape_size * dir;
                    if($scope.check_bounds(x, new_y)) {
                        var replacement_idx = $scope.shapes_indexes.by_x[x][new_y];
                        if($scope.shapes[replacement_idx] != $scope.selected) {
                            if(typeof replacement_idx != 'undefined' &&
                                typeof $scope.shapes[replacement_idx] != 'undefined') {
                                if($scope.shapes[replacement_idx].color == colors['gblock'] ||
                                        $scope.shapes[replacement_idx].color == colors['enemy_emitter']) {
                                    continue;
                                }
                                $scope.shapes[replacement_idx].y = $scope.shapes[i].y;
                            }
                            $scope.update_indexes($scope.shapes[i].x, $scope.shapes[i].y, x, new_y);
                            $scope.shapes[i].y = new_y;
                        }
                    }
                }
            }
        }
    }

    $scope.try_to_emit_enemy = function(emitter) {
        if(Math.random() > 0.5) {
            var possible_spots = [];
            for(var i = -1, j, x, y; i <= 1; i++) {
                for(j = -1; j <= 1; j++) {
                    x = emitter.x + i * cnf.shape_size;
                    y = emitter.y + j * cnf.shape_size;
                    if($scope.check_bounds(x, y)) {
                        if(typeof $scope.shapes_indexes.by_x[x] == 'undefined' ||
                                typeof $scope.shapes_indexes.by_x[x][y] == 'undefined') {
                            possible_spots.push({x: x, y: y});
                        }
                    }
                }
            }
            if(possible_spots.length > 0) {
                var new_enemy = possible_spots[Math.floor(Math.random() * possible_spots.length)];
                $scope.shapes.push( buildShape(colors['enemy'], new_enemy.x, new_enemy.y) );
                $scope.addIndex(new_enemy.x, new_enemy.y, $scope.shapes.length - 1);
            }
        }
    };

    $scope.update_indexes = function(x, y, new_x, new_y) {
        var tmp_by_y, tmp_by_x;
        if(x != new_x) {
            tmp_by_x = $scope.shapes_indexes.by_x[new_x][y];
            tmp_by_y = $scope.shapes_indexes.by_y[y][new_x];
            $scope.shapes_indexes.by_x[new_x][y] = $scope.shapes_indexes.by_x[x][y];
            $scope.shapes_indexes.by_y[y][new_x] = $scope.shapes_indexes.by_y[y][x];
            $scope.shapes_indexes.by_x[x][y] = tmp_by_x;
            $scope.shapes_indexes.by_y[y][x] = tmp_by_y;
        }
        if(y != new_y) {
            tmp_by_y = $scope.shapes_indexes.by_y[new_y][x];
            tmp_by_x = $scope.shapes_indexes.by_x[x][new_y];
            $scope.shapes_indexes.by_y[new_y][x] = $scope.shapes_indexes.by_y[y][x];
            $scope.shapes_indexes.by_x[x][new_y] = $scope.shapes_indexes.by_x[x][y];
            $scope.shapes_indexes.by_x[x][y] = tmp_by_x;
            $scope.shapes_indexes.by_y[y][x] = tmp_by_y;
        }
    }

    $scope.check_matching = function(x, y) {
        if(typeof $scope.shapes_indexes.by_x[x] != 'undefined' &&
                typeof $scope.shapes_indexes.by_x[x][y] != 'undefined' &&
                $scope.shapes[$scope.shapes_indexes.by_x[x][y]].hidden == 0) {
            if($scope.shapes[$scope.shapes_indexes.by_x[x][y]].color == colors['enemy']) {
                $scope.lives--;
                $scope.selected.damaged = 1;
                $timeout(function(){
                    $scope.selected.damaged = 0;
                }, 200);
                $scope.checkLives();
            }
            if($scope.shapes[$scope.shapes_indexes.by_x[x][y]].color == colors['lblock']) {
                $scope.score += 10;
                $scope.lblocks++;
            }
            if($scope.shapes[$scope.shapes_indexes.by_x[x][y]].color == colors['gblock']) {
                $scope.score += 50;
                $scope.gblocks++;
            }
            $scope.shapes[$scope.shapes_indexes.by_x[x][y]].hidden = 1;
            $scope.deleteIndex(x, y);
        }
    };

    $scope.checkLives = function() {
        if($scope.lives < 1) {
            $scope.dead = true;
        }
    };

    $scope.check_bounds = function(x, y) {
        return (x >= 0 && y >= 0 && x < (cnf.shape_size * cnf.board_x_shapes) && y < (cnf.shape_size * cnf.board_y_shapes));
    };

    $scope.detect_collisions = function(x, y) {
        var allow = true;
        if(typeof $scope.shapes_indexes.by_x[x][y] != 'undefined' &&
                $scope.shapes[$scope.shapes_indexes.by_x[x][y]].hidden == 0) {
            allow = false;
        }
        return allow;
    };

    // Create shapes
    for (i = 0; ($scope.i = $scope.i + cnf.shape_size) < (cnf.shape_size * cnf.board_x_shapes * cnf.board_y_shapes); i++) {
        if(Math.random() > 0.5) {
            $scope.shapes.push( buildShape() );
        }
    }

    $scope.set_emitters = function() {
        for(var ii = 0, idx; ii < cnf.enemy_emitters; ii++) {
            idx = Math.round(Math.random() * $scope.shapes.length);
            $scope.shapes[idx].color = colors['enemy_emitter'];
            $scope.enemy_emitters_indexes.push(idx);
            console.log($scope.shapes[idx].x, $scope.shapes[idx].y);

            for(var i = -1, j, x, y; i <= 1; i++) {
                for(j = -1; j <= 1; j++) {
                    if(i != 0 || j != 0) {
                        x = $scope.shapes[idx].x + i * cnf.shape_size;
                        y = $scope.shapes[idx].y + j * cnf.shape_size;
                        if($scope.check_bounds(x, y)) {
                            if(typeof $scope.shapes_indexes.by_x[x] != 'undefined' &&
                                    typeof $scope.shapes_indexes.by_x[x][y] != 'undefined') {
                                console.log(x,y);
                                $scope.shapes[$scope.shapes_indexes.by_x[x][y]].hidden = 1;
                                $scope.deleteIndex(x, y);
                            }
                        }
                    }
                }
            }
        }
    };

    $scope.buildIndexes();
    $scope.set_emitters();
}

blocksApp.filter('rgb', function(){
    return function(color){
        var str = color.toString(16);
        return '#' + '0'.repeat(6 - str.length) + str;
    };
});

String.prototype.repeat = function( num )
{
    if(num > 0)
    {
        return new Array( num + 1 ).join( this );
    }
    else
    {
        return '';
    }
}


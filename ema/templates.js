this.Ema=this.Ema||{},this.Ema.StaticAssets=this.Ema.StaticAssets||{},this.Ema.StaticAssets.Templates=this.Ema.StaticAssets.Templates||{},this.Ema.StaticAssets.Templates.Tasks=this.Ema.StaticAssets.Templates.Tasks||{},this.Ema.StaticAssets.Templates.Tasks.TasksPopover=Handlebars.template({1:function(t,a,e,l,n){return"hidden"},3:function(t,a,e,l,n){var s;return null!=(s=t.invokePartial(l.IncompleteTask,a,{name:"IncompleteTask",data:n,indent:"\t\t",helpers:e,partials:l,decorators:t.decorators}))?s:""},5:function(t,a,e,l,n){var s;return null!=(s=t.invokePartial(l.CompletedTask,a,{name:"CompletedTask",data:n,indent:"\t\t",helpers:e,partials:l,decorators:t.decorators}))?s:""},compiler:[7,">= 4.0.0"],main:function(t,a,e,l,n){var s,r=null!=a?a:t.nullContext||{};return'<ul class="popover-content-lg list-unstyled list-separated task-list">\r\n\t<li class="'+(null!=(s=e.if.call(r,null!=(s=null!=a?a.Incomplete:a)?s.length:s,{name:"if",hash:{},fn:t.program(1,n,0),inverse:t.noop,data:n}))?s:"")+' text-muted js-task-nodata-message"><em>No open tasks</em></li>\r\n'+(null!=(s=e.each.call(r,null!=a?a.Incomplete:a,{name:"each",hash:{},fn:t.program(3,n,0),inverse:t.noop,data:n}))?s:"")+"\r\n"+(null!=(s=e.each.call(r,null!=a?a.Completed:a,{name:"each",hash:{},fn:t.program(5,n,0),inverse:t.noop,data:n}))?s:"")+"</ul>"},usePartial:!0,useData:!0}),Handlebars.registerPartial("CompletedTask",Handlebars.template({1:function(t,a,e,l,n){var s;return'\t\t\t\t<div class="text-muted task-text">\r\n\t\t\t\t\t'+(null!=(s=(e.ellipsify||a&&a.ellipsify||e.helperMissing).call(null!=a?a:t.nullContext||{},null!=a?a.Text:a,100,50,"TasksToggleMessage",{name:"ellipsify",hash:{},data:n}))?s:"")+"\r\n\t\t\t\t</div>\r\n"},3:function(t,a,e,l,n){return""},5:function(t,a,e,l,n){var s;return'\t\t\t\t<span class="reduced-opacity js-fade-when-task-complete pull-right" title="Due date">\r\n\t\t\t\t\t'+t.escapeExpression((s=null!=(s=e.DueDate||(null!=a?a.DueDate:a))?s:e.helperMissing,"function"==typeof s?s.call(null!=a?a:t.nullContext||{},{name:"DueDate",hash:{},data:n}):s))+"\r\n\t\t\t\t</span>\r\n"},compiler:[7,">= 4.0.0"],main:function(t,a,e,l,n){var s,r,i=null!=a?a:t.nullContext||{},o=e.helperMissing,u="function",c=t.escapeExpression;return'<li class="collapse in text-muted hidden js-task-completed">\r\n\t<div class="row">\r\n\t\t<div class="col-xs-7 col-sm-9 reduced-opacity js-fade-when-task-complete">\r\n\t\t\t<div class="text-ellipsis" title="'+c((r=null!=(r=e.Subject||(null!=a?a.Subject:a))?r:o,typeof r===u?r.call(i,{name:"Subject",hash:{},data:n}):r))+'">\r\n\t\t\t\t<strong>'+c((r=null!=(r=e.Subject||(null!=a?a.Subject:a))?r:o,typeof r===u?r.call(i,{name:"Subject",hash:{},data:n}):r))+"</strong>\r\n\t\t\t</div>\r\n"+(null!=(s=e.if.call(i,null!=a?a.Text:a,{name:"if",hash:{},fn:t.program(1,n,0),inverse:t.noop,data:n}))?s:"")+'\t\t</div>\r\n\t\t<div class="col-xs-5 col-sm-3">\r\n'+(null!=(s=e.if.call(i,null!=a?a.HideDueDateFromClient:a,{name:"if",hash:{},fn:t.program(3,n,0),inverse:t.program(5,n,0),data:n}))?s:"")+'\t\t\t<br />\r\n\t\t\t<span>\r\n\t\t\t\t<a href="javascript:void(0);" class="pull-right dissmiss-link js-task-complete hidden" data-task="'+c((r=null!=(r=e.ID||(null!=a?a.ID:a))?r:o,typeof r===u?r.call(i,{name:"ID",hash:{},data:n}):r))+'" data-date="'+c((r=null!=(r=e.Due||(null!=a?a.Due:a))?r:o,typeof r===u?r.call(i,{name:"Due",hash:{},data:n}):r))+'" data-trackevent-label="Popover"><i class="fa fa-times-circle-o"></i> Complete</a>\r\n\t\t\t\t<a href="javascript:void(0);" class="pull-right dissmiss-link js-task-reopen" data-task="'+c((r=null!=(r=e.ID||(null!=a?a.ID:a))?r:o,typeof r===u?r.call(i,{name:"ID",hash:{},data:n}):r))+'" data-date="'+c((r=null!=(r=e.Due||(null!=a?a.Due:a))?r:o,typeof r===u?r.call(i,{name:"Due",hash:{},data:n}):r))+'" data-trackevent-label="Popover"><i class="fa fa-undo"></i> Re-open</a>\r\n\t\t\t</span>\r\n\t\t</div>\r\n\t</div>\r\n</li>'},useData:!0})),this.Ema.StaticAssets.Templates.Tasks.TasksPopoverTitle=Handlebars.template({1:function(t,a,e,l,n){return' disabled="disabled" '},compiler:[7,">= 4.0.0"],main:function(t,a,e,l,n){var s;return'<div class="popover-content-title">\r\n    <div class="row">\r\n        <div class=\'col-sm-7 center-items-vertical\'>\r\n            <h3 class=\'h3\'>\r\n                <i class="fa fa-check-square"></i>\r\n                Tasks Assigned to You\r\n            </h3>\r\n        </div>\r\n        <div class="col-sm-5">\r\n            <button\r\n                    class="btn btn-default btn-sm pull-right task-toggle-view js-task-toggle-view"\r\n                    data-show-all="true"\r\n                '+(null!=(s=e.unless.call(null!=a?a:t.nullContext||{},null!=a?a.HasCompletedTasks:a,{name:"unless",hash:{},fn:t.program(1,n,0),inverse:t.noop,data:n}))?s:"")+">\r\n                Show Completed Tasks\r\n            </button>\r\n        </div>\r\n    </div>\r\n</div>"},useData:!0}),Handlebars.registerPartial("IncompleteTask",Handlebars.template({1:function(t,a,e,l,n){return"OVERDUE:&nbsp;"},3:function(t,a,e,l,n){var s;return'            <div class="text-muted task-text">\r\n                '+(null!=(s=(e.ellipsify||a&&a.ellipsify||e.helperMissing).call(null!=a?a:t.nullContext||{},null!=a?a.Text:a,100,50,"TasksToggleMessage",{name:"ellipsify",hash:{},data:n}))?s:"")+"\r\n            </div>\r\n"},5:function(t,a,e,l,n){var s,r=null!=a?a:t.nullContext||{},i=e.helperMissing,o=t.escapeExpression;return'            <span>\r\n                <a href="'+o((s=null!=(s=e.URL||(null!=a?a.URL:a))?s:i,"function"==typeof s?s.call(r,{name:"URL",hash:{},data:n}):s))+'">'+o((s=null!=(s=e.Category||(null!=a?a.Category:a))?s:i,"function"==typeof s?s.call(r,{name:"Category",hash:{},data:n}):s))+"</a>\r\n            </span>\r\n"},7:function(t,a,e,l,n){return""},9:function(t,a,e,l,n){var s,r,i=null!=a?a:t.nullContext||{};return'            <span class="js-fade-when-task-complete pull-right '+(null!=(s=e.if.call(i,null!=a?a.IsOverdue:a,{name:"if",hash:{},fn:t.program(10,n,0),inverse:t.noop,data:n}))?s:"")+'" title="'+(null!=(s=e.if.call(i,null!=a?a.IsOverdue:a,{name:"if",hash:{},fn:t.program(12,n,0),inverse:t.program(14,n,0),data:n}))?s:"")+'">\r\n                '+t.escapeExpression((r=null!=(r=e.DueDate||(null!=a?a.DueDate:a))?r:e.helperMissing,"function"==typeof r?r.call(i,{name:"DueDate",hash:{},data:n}):r))+"\r\n            </span>\r\n"},10:function(t,a,e,l,n){return"text-danger"},12:function(t,a,e,l,n){return"This task is overdue"},14:function(t,a,e,l,n){return"Due date"},compiler:[7,">= 4.0.0"],main:function(t,a,e,l,n){var s,r,i=null!=a?a:t.nullContext||{},o=e.helperMissing,u="function",c=t.escapeExpression;return'<li class="collapse in">\r\n    <div class="row">\r\n        <div class="col-xs-7 col-sm-9 js-fade-when-task-complete">\r\n            <div class="text-ellipsis">\r\n                <strong>'+(null!=(s=e.if.call(i,null!=a?a.IsOverdue:a,{name:"if",hash:{},fn:t.program(1,n,0),inverse:t.noop,data:n}))?s:"")+c((r=null!=(r=e.Subject||(null!=a?a.Subject:a))?r:o,typeof r===u?r.call(i,{name:"Subject",hash:{},data:n}):r))+"</strong>\r\n            </div>\r\n"+(null!=(s=e.if.call(i,null!=a?a.Text:a,{name:"if",hash:{},fn:t.program(3,n,0),inverse:t.noop,data:n}))?s:"")+(null!=(s=e.if.call(i,null!=a?a.Category:a,{name:"if",hash:{},fn:t.program(5,n,0),inverse:t.noop,data:n}))?s:"")+'        </div>\r\n        <div class="col-xs-5 col-sm-3">\r\n'+(null!=(s=e.if.call(i,null!=a?a.HideDueDateFromClient:a,{name:"if",hash:{},fn:t.program(7,n,0),inverse:t.program(9,n,0),data:n}))?s:"")+'            <br />\r\n            <span>\r\n                <a href="javascript:void(0);" class="pull-right dissmiss-link js-task-complete" data-task="'+c((r=null!=(r=e.ID||(null!=a?a.ID:a))?r:o,typeof r===u?r.call(i,{name:"ID",hash:{},data:n}):r))+'" data-date="'+c((r=null!=(r=e.Due||(null!=a?a.Due:a))?r:o,typeof r===u?r.call(i,{name:"Due",hash:{},data:n}):r))+'" data-trackevent-label="Popover"><i class="fa fa-times-circle-o"></i> Complete</a>\r\n                <a href="javascript:void(0);" class="pull-right dissmiss-link js-task-reopen hidden" data-task="'+c((r=null!=(r=e.ID||(null!=a?a.ID:a))?r:o,typeof r===u?r.call(i,{name:"ID",hash:{},data:n}):r))+'" data-date="'+c((r=null!=(r=e.Due||(null!=a?a.Due:a))?r:o,typeof r===u?r.call(i,{name:"Due",hash:{},data:n}):r))+'" data-trackevent-label="Popover"><i class="fa fa-undo"></i> Re-open</a>\r\n            </span>\r\n        </div>\r\n    </div>\r\n</li>'},useData:!0})),this.Ema.StaticAssets.Templates.Tasks.TasksToggleMessage=Handlebars.template({compiler:[7,">= 4.0.0"],main:function(t,a,e,l,n){var s,r=null!=a?a:t.nullContext||{},i=e.helperMissing,o=t.escapeExpression;return"<span>\r\n\t"+o((s=null!=(s=e.Text||(null!=a?a.Text:a))?s:i,"function"==typeof s?s.call(r,{name:"Text",hash:{},data:n}):s))+'&hellip;&nbsp;<a href="javascript:void(0)" class="js-task-toggle-message text-nowrap">Show more</a>\r\n</span>\r\n<span class="hidden">\r\n\t'+o((s=null!=(s=e.FullText||(null!=a?a.FullText:a))?s:i,"function"==typeof s?s.call(r,{name:"FullText",hash:{},data:n}):s))+'&nbsp;&nbsp;<a href="javascript:void(0)" class="js-task-toggle-message text-nowrap">Show less</a>\r\n</span>'},useData:!0}),this.Ema.StaticAssets.Templates.TransientNotifications=this.Ema.StaticAssets.Templates.TransientNotifications||{},this.Ema.StaticAssets.Templates.TransientNotifications.TransientNotification=Handlebars.template({compiler:[7,">= 4.0.0"],main:function(t,a,e,l,n){var s,r=null!=a?a:t.nullContext||{},i=e.helperMissing,o=t.escapeExpression;return'<div class="modal fade">\r\n\t<div class="modal-dialog" style="top: 115px;">\r\n\t\t<div class="modal-content '+o((s=null!=(s=e.Type||(null!=a?a.Type:a))?s:i,"function"==typeof s?s.call(r,{name:"Type",hash:{},data:n}):s))+'-notification">\r\n\t\t\t<div class="modal-body">\r\n\t\t\t\t<p class="h1 text-center">\r\n\t\t\t\t\t'+o((s=null!=(s=e.Title||(null!=a?a.Title:a))?s:i,"function"==typeof s?s.call(r,{name:"Title",hash:{},data:n}):s))+'\r\n\t\t\t\t</p>\r\n\t\t\t\t<p class="text-center '+o((s=null!=(s=e.Type||(null!=a?a.Type:a))?s:i,"function"==typeof s?s.call(r,{name:"Type",hash:{},data:n}):s))+'-notification-body">\r\n\t\t\t\t\t'+o((s=null!=(s=e.Message||(null!=a?a.Message:a))?s:i,"function"==typeof s?s.call(r,{name:"Message",hash:{},data:n}):s))+"\r\n\t\t\t\t</p>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n"},useData:!0});
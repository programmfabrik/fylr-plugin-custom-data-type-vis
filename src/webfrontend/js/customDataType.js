var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
var hasProp = {}.hasOwnProperty;

var CustomDataTypeVIS = (function(superClass) {
    extend(CustomDataTypeVIS, superClass);

    function CustomDataTypeVIS() {
        return CustomDataTypeVIS.__super__.constructor.apply(this, arguments);
    }

    const Plugin = CustomDataTypeVIS.prototype;

    Plugin.getCustomDataTypeName = function() {
        return 'custom:base.custom-data-type-vis.vis';
    };

    Plugin.getCustomDataTypeNameLocalized = function() {
        return $$('custom.data.type.vis.name');
    };

    Plugin.isEmpty = function(data, top_level_data, opts={}) {
        if (opts.mode === 'expert') {
            return CUI.util.isEmpty(data[this.name()]?.trim());
        } else {
            return !data[this.name()]?.objektid;
        }
    };

    Plugin.getCustomDataOptionsInDatamodelInfo = function(custom_settings) {
        return [];
    };

    Plugin.initData = function(data) {
        let cdata;

        if (!data[this.name()]) {
            cdata = {};
            data[this.name()] = cdata;
        } else {
            cdata = data[this.name()];
        }

        return cdata;
    };

    Plugin.renderFieldAsGroup = function(data, top_level_data, opts) {
        return false;
    };

    Plugin.supportsFacet = function() {
        return false;
    };

    Plugin.renderSearchInput = function(data, opts) {
        const inputElement = new CUI.Input({
            data: data,
            name: this.name(),
            placeholder: $$('custom.data.type.vis.search.placeholder')
        });

        CUI.Events.listen({
            node: inputElement,
            type: 'data-changed',
            call: () => {
                CUI.Events.trigger({
                    node: inputElement,
                    type: 'search-input-change'
                });
            }
        });

        return inputElement.start();
    };

    Plugin.getSearchFilter = function(data, key = this.name()) {
        if (data[key + ':unset']) {
            return {
                type: 'in',
                bool: 'should',
                fields: [this.path() + '.' + this.name() + '.zeichen'],
                in: [null],
                _unnest: true,
                _unset_filter: true
            };
        } else if (data[key + ':has_value']) {
            return this.getHasValueFilter(data, key);
        } else if (data[key]?.length) {
            return {
                type: 'match',
                bool: 'should',
                fields: [this.path() + '.' + this.name() + '.zeichen'],
                string: data[key].replace('VIS-SmartClient:', '').trim()
            };
        }
    };

    Plugin.getHasValueFilter = function(data, key = this.name()) {
        if (data[key + ':has_value']) {
            return {
                type: 'in',
                bool: 'should',
                fields: [this.path() + '.' + this.name() + '.zeichen'],
                in: [null],
                bool: 'must_not',
                _unnest: true,
                _unset_filter: true
            };
        }
    };

    Plugin.getQueryFieldBadge = function(data) {
        const result = {
            name: this.nameLocalized()
        };

        if (data[this.name() + ':unset']) {
            result.value = $$('text.column.badge.without');
        } else if (data[this.name() + ':has_value']) {
            result.value = $$('field.search.badge.has_value');
        } else {
            result.value = data[this.name()];
        }

        return result;
    };

    Plugin.getSaveData = function(data, save_data, opts = {}) {
        if (this.isEmpty(data)) {
            save_data[this.name()] = null;
        } else {
            save_data[this.name()] = {
                objektid: data[this.name()].objektid,
                zeichen: data[this.name()].zeichen,
                typ: data[this.name()].typ,
                subtyp: data[this.name()].subtyp
            };
        }
    };

    Plugin.renderDetailOutput = function(data, top_level_data, opts) {
        const cdata = this.initData(data);

        if (this.__isValidData(cdata)) {
            return this.__getDocumentEntry(cdata);
        } else {
            return new CUI.EmptyLabel({ text: $$('custom.data.type.vis.edit.invalidEntry') });
        }
    };

    Plugin.__getDocumentEntry = function(cdata) {
        const container = CUI.dom.div();

        CUI.dom.append(container, new CUI.Label({ text: this.__getDocumentLabel(cdata) }));
        if (!cdata.subtyp || this.__hasAccessRights()) {
            CUI.dom.append(container, this.__getDetailInfoIconButton(cdata));
        }

        return container;
    };

    Plugin.__getDetailInfoIconButton = function(cdata) {
        return new CUI.ButtonHref({
            class: 'vis-plugin-detail-info-icon',
            text: '',
            icon: new CUI.Icon({ class: 'fa-info-circle' }),
            onClick: (_, buttonElement) => this.__openDetailInfoTooltip(cdata, buttonElement)
        });
    };

    Plugin.renderEditorInput = function(data, topLevelData, opts) {
        const cdata = this.initData(data);
        const systemObjectId = opts.top_level_data._system_object_id;
        const uuid = opts.top_level_data._uuid;
        const objectTypeLabel = opts.top_level_data._objecttype_display_name['de-DE'];

        const layoutElement = new CUI.HorizontalLayout({
            class: 'customPluginEditorLayout vis-plugin-layout',
            left: {},
            center: {},
            right: {}
        });

        this.__updateEditorInput(topLevelData, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);

        return layoutElement;
    };

    Plugin.__updateEditorInput = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        if (!systemObjectId || !uuid) {
            this.__updateEditorInputForNewObject(layoutElement);
        } else if (this.__isValidData(cdata)) {
            this.__updateEditorInputForFilledField(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);
        } else {
            this.__updateEditorInputForEmptyField(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);
        }
    };

    Plugin.__updateEditorInputForNewObject = function(layoutElement) {    
        layoutElement.replace(undefined, 'left');
        layoutElement.replace(this.__getCreationNotPossibleInfo(), 'center');
        layoutElement.replace(undefined, 'right');
    };

    Plugin.__updateEditorInputForFilledField = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        layoutElement.replace(undefined, 'left');
        layoutElement.replace(this.__renderDocumentInfo(cdata), 'center');
        layoutElement.replace(this.__renderActionsButtonBar(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel), 'right');
    };

    Plugin.__updateEditorInputForEmptyField = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        let inputElement;

        const getInputValue = function() {
            return inputElement.getValueForInput();
        }

        const linkButtonElement = this.__getLinkButton(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel, getInputValue);
        inputElement = this.__renderInputField(linkButtonElement);

        layoutElement.replace(this.__getCreateDocumentButton(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel), 'left');
        layoutElement.replace(inputElement, 'center');
        layoutElement.replace(linkButtonElement, 'right');
    };

    Plugin.__getCreationNotPossibleInfo = function() {
        return new CUI.EmptyLabel({
            text: $$('custom.data.type.vis.creationNotPossible'),
            class: 'creation-not-possible-info'
        });
    };

    Plugin.__getCreateDocumentButton = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        const types = this.__getCreatableTypes();
        
        return new CUI.Button({
            text: '',
            icon: new CUI.Icon({ class: 'fa-plus' }),
            class: 'pluginDirectSelectEditSearchFylr create-document-button',
            disabled: !this.__hasAccessRights() || !types.length || !systemObjectId || !uuid,
            onClick: () => this.__openCreateDocumentModal(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel, types)
        });
    };

    Plugin.__openCreateDocumentModal = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel, types) {
        const inputData = { type: types[0].id };

        const modal = new CUI.Modal({
            pane: {
                content: this.__getCreateDocumentForm(types, inputData),
                class: 'vis-plugin-create-document-modal',
                header_left: new CUI.Label({ text: $$('custom.data.type.vis.createDocument.header') }),
                footer_right: [
                    new CUI.Button({
                        text: $$('custom.data.type.vis.cancel'),
                        class: 'cui-dialog',
                        onClick: () => this.__closeModal(modal)
                    }),
                    new CUI.Button({
                        text: $$('custom.data.type.vis.createDocument.confirm'),
                        class: 'cui-dialog',
                        primary: true,
                        onClick: () => {
                            const selectedType = types.find(type => inputData.type === type.id);
                            this.__closeModal(modal);

                            const creationInProgressModal = this.__openCreationInProgressModal();
                            this.__startDocumentCreation(selectedType, data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel).finally(() => {
                                this.__closeModal(creationInProgressModal);
                            });
                        }
                    })
                ]
            }
        });

        modal.autoSize();

        return modal.show();
    };

    Plugin.__getCreateDocumentForm = function(types, inputData) {
        return new CUI.Form({
            data: inputData,
            fields: [{
                type: CUI.Select,
                class: 'vis-plugin-type-select',
                name: 'type',
                form: {
                    label: $$('custom.data.type.vis.field.type')
                },
                options: types.map(type => { return { text: type.label, value: type.id }; })
            }]
        }).start();
    };

    Plugin.__openCreationInProgressModal = function() {
        const modal = new CUI.Modal({
            pane: {
                header_left: new CUI.Label({ text: $$('custom.data.type.vis.createDocument.header') }),
                content: new CUI.Label({ icon: 'spinner', text: $$('custom.data.type.vis.creationInProgress.info') })
            }
        });

        modal.autoSize();

        return modal.show();   
    };

    Plugin.__startDocumentCreation = async function(type, data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        const { fullContent, shortContent, title, emptyFields } = await this.__getNewDocumentContent(data, systemObjectId);
        if (emptyFields.length) {
            return this.__showEmptyFieldsWarning(type, data, cdata, systemObjectId, uuid, layoutElement, fullContent, shortContent, objectTypeLabel, title, emptyFields);
        } else {
            return this.__addNewDocument(type, data, cdata, systemObjectId, uuid, layoutElement, fullContent, shortContent, objectTypeLabel, title);
        }
    };

    Plugin.__addNewDocument = function(type, data, cdata, systemObjectId, uuid, layoutElement, fullContent, shortContent, objectTypeLabel, title) {
        return this.__createDocument(type, uuid, fullContent, shortContent, objectTypeLabel, title)
            .then(result => {
                if (result) this.__addEntry(result, data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);
            });
    };

    Plugin.__showEmptyFieldsWarning = function(type, data, cdata, systemObjectId, uuid, layoutElement, fullContent, shortContent, objectTypeLabel, title, emptyFields) {
        return new Promise(resolve => {
            const modalDialog = new CUI.ConfirmationDialog({
                title: $$('custom.data.type.vis.emptyFields.modal.title'),
                text: $$('custom.data.type.vis.emptyFields.modal.text') + ' ' + emptyFields.join(', '),
                cancel: false,
                buttons: [{
                    text: $$('custom.data.type.vis.cancel'),
                    onClick: () => {
                        modalDialog.destroy();
                        resolve();
                    }
                }, {
                    text: $$('custom.data.type.vis.ok'),
                    primary: true,
                    onClick: () => {
                        modalDialog.destroy();
                        this.__addNewDocument(type, data, cdata, systemObjectId, uuid, layoutElement, fullContent, shortContent, objectTypeLabel, title).then(() => resolve());
                    }
                }]
            });
            
            modalDialog.show();
        });
    };

    Plugin.__getNewDocumentContent = async function(data, systemObjectId) {
        const nestedPrefix = '_nested:' + this.__getObjectType() + '__';
        const regionElements = await this.__getRegionElements(data, nestedPrefix);
        const region = this.__getRegion(regionElements);
        const shortRegion = this.__getRegion(regionElements, true);
        const cityDistrict = this.__getListValueFromObjectData(
            data, nestedPrefix + 'politische_zugehoerigkeit', 'stadtteil'
        );
        const addressFilter = value => value.lk_adresstyp?.conceptURI === 'http://uri.gbv.de/terminology/nld_address_type/9ee12d18-d708-4ccb-b7fc-8a64b6e3d445';
        const street = this.__getListValueFromObjectData(data, nestedPrefix + 'anschrift', 'strasse', addressFilter);
        const buildingNumber = this.__getListValueFromObjectData(data, nestedPrefix + 'anschrift', 'hausnummer', addressFilter);
        const buildingNumberSuffix = this.__getListValueFromObjectData(data, nestedPrefix + 'anschrift', 'hausnummer_zusatz', addressFilter);
        const type = data.lk_objekttyp?.conceptName;
        const title = this.__getListValueFromObjectData(data, nestedPrefix + 'titel', 'titel', undefined, 2);

        const fullContentElements = [];
        const shortContentElements = [];
        const emptyFields = [];

        fullContentElements.push('#' + systemObjectId);
        shortContentElements.push('#' + systemObjectId);

        if (region && shortRegion) {
            fullContentElements.push(region);
            shortContentElements.push(shortRegion);
        } else {
            emptyFields.push('Gebietszugehörigkeit');
        }

        if (cityDistrict) {
            fullContentElements.push(cityDistrict);
        } else {
            emptyFields.push('Stadtteil / Lagebezeichnung');
        }

        if (street && (buildingNumber || buildingNumberSuffix)) {
            let address = street + ' ';
            if (buildingNumber) address += buildingNumber;
            if (buildingNumberSuffix) address += buildingNumberSuffix;
            fullContentElements.push(address);
            shortContentElements.push(address);
        } else {
            if (!street) emptyFields.push('Straße');
            if (!buildingNumber && !buildingNumberSuffix) emptyFields.push('Hausnummer oder Hausnummernzusatz');
        }

        if (type) {
            fullContentElements.push(type);
            shortContentElements.push(type);
         } else {
            emptyFields.push('Objekttyp');
        }

        if (title) {
            fullContentElements.push(title);
        } else {
            emptyFields.push('Objektbezeichnung');
        }

        return {
            fullContent: fullContentElements.join(', '),
            shortContent: shortContentElements.join(', ').slice(0, 50),
            title,
            emptyFields
        };
    };

    Plugin.__getRegionElements = async function(data, nestedPrefix) {
        const danteConcept = this.__getListValueFromObjectData(
            data, nestedPrefix + 'politische_zugehoerigkeit', 'lk_politische_zugehoerigkeit'
        );

        if (!danteConcept?.conceptURI || !danteConcept?.conceptName) return [];

        const concept = await this.__performGetRequest(
            'https://api.dante.gbv.de/data?uri=' + danteConcept.conceptURI + '&properties=-',
            'application/json'
        );

        const ancestors = await this.__performGetRequest(
            'https://api.dante.gbv.de/ancestors?uri=' + danteConcept.conceptURI + '&properties=-',
            'application/json'
        );

        return concept.concat(ancestors)
            .map(ancestor => ancestor.prefLabel.de ?? ancestor.prefLabel.zxx)
            .reverse();
    };

    Plugin.__getRegion = function(elements, short = false) {
        if (elements.length < 2 || (short && elements.length < 3)) return undefined;

        if (short) {
            return elements[2];
        } else {
            let result = 'Ldkr. ' + elements[1];
            if (elements.length > 2) result += ', Gde. ' + elements[2];
            if (elements.length > 3) result += ', Gmkg. ' + elements[3];

            return result;
        }
    };

    Plugin.__getListValueFromObjectData = function(data, fieldName, subfieldName, filterFunction = (_) => _, numberOfEntries = 1) {
        const entries = filterFunction ? data?.[fieldName]?.filter(filterFunction) : data?.[fieldName];
        return entries.length
            ? numberOfEntries > 1
                ? entries.slice(0, numberOfEntries).map(entry => entry[subfieldName]).join(', ')
                : entries[0][subfieldName]
            : undefined;
    };

    Plugin.__renderDocumentInfo = function(cdata) {
        return new CUI.VerticalLayout({
            class: 'ez5-info_commonPlugin',
            top: {
                content: new CUI.Label({
                    text: this.__getDocumentLabel(cdata),
                    multiline: true
                })
            }
        });
    };

    Plugin.__renderInputField = function() {
        return new CUI.Input({
            name: 'directSelectInput',
            class: 'pluginDirectSelectEditInput',
            undo_and_changed_support: false,
            content_size: false,
            disabled: !this.__hasAccessRights()
        }).start();
    };

    Plugin.__getLinkButton = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel, getInputValue) {
        return new CUI.Button({
            text: '',
            icon: new CUI.Icon({ class: 'fa-link' }),
            class: 'pluginDirectSelectEditSearchFylr link-document-button',
            disabled: !this.__hasAccessRights(),
            onClick: () => this.__createDocumentLink(getInputValue(), systemObjectId, uuid, data, cdata, layoutElement, objectTypeLabel)
        });
    };

    Plugin.__createDocumentLink = function(searchString, systemObjectId, uuid, data, cdata, layoutElement, objectTypeLabel, ignoreTitle = false) {
        searchString = searchString?.toLowerCase().replace('vis-smartclient:', '').trim();
        if (!searchString?.length) return this.__showErrorMessage('visLinkMissingInput');

        const type = this.__getTypeFromSearchString(searchString);
        if (!type) return this.__showErrorMessage('visLinkInvalidFormat');

        let title;
        if (!ignoreTitle) {
            title = this.__getListValueFromObjectData(
                data, '_nested:' + this.__getObjectType() + '__titel', 'titel', undefined, 2
            );
            if (!title?.length) return this.__showMissingTitleWarning(searchString, systemObjectId, uuid, data, cdata, layoutElement, objectTypeLabel);
        }

        let documentId, visDocument;

        return this.__searchDocument(searchString, type).then(documentIds => {
            if (documentIds?.length !== 1) {
                throw type === 'Akte' ? 'visLinkFileNotFound' : 'visLinkProcessNotFound';
            }
            documentId = documentIds[0];
            return this.__getVISDocument(documentId, type);
        }).then(result => {
            visDocument = result;
            return this.__linkDocumentToObject(documentId, uuid, objectTypeLabel, title);
        }).then(result => {
            if (!result) throw type === 'Akte' ? 'visLinkCreateLinkFailureFile' : 'visLinkCreateLinkFailureProcess';
            const entryData = {
                objektid: documentId,
                zeichen: visDocument.aktenzeichen ?? visDocument.vorgangszeichen,
                typ: type,
                subtyp: this.__getSubtype(visDocument)
            };
            this.__addEntry(entryData, data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);
        }).catch(errorId => {
            this.__showErrorMessage(errorId);
        });
    };

    Plugin.__showMissingTitleWarning = function(searchString, systemObjectId, uuid, data, cdata, layoutElement, objectTypeLabel) {
        return new Promise(resolve => {
            const modalDialog = new CUI.ConfirmationDialog({
                title: $$('custom.data.type.vis.missingTitle.modal.title'),
                text: $$('custom.data.type.vis.missingTitle.modal.text'),
                cancel: false,
                buttons: [{
                    text: $$('custom.data.type.vis.cancel'),
                    onClick: () => {
                        modalDialog.destroy();
                        resolve();
                    }
                }, {
                    text: $$('custom.data.type.vis.ok'),
                    primary: true,
                    onClick: () => {
                        modalDialog.destroy();
                        this.__createDocumentLink(searchString, systemObjectId, uuid, data, cdata, layoutElement, objectTypeLabel, true).then(() => resolve());
                    }
                }]
            });
            
            modalDialog.show();
        });
    };

    Plugin.__getSubtype = function(visDocument) {
        const subtypeFieldPathElements = this.__getBaseConfiguration().subtype_field_path?.split('.');
        if (!subtypeFieldPathElements?.length) return undefined;

        let value = visDocument;
        do {
            value = value[subtypeFieldPathElements.shift()];
        } while (value && subtypeFieldPathElements.length)

        return value;
    };

    Plugin.__getTypeFromSearchString = function(searchString) {
        switch (searchString.split('/').length) {
            case 2:
                return 'Akte';
            case 3:
                return 'Vorgang';
            default:
                return undefined;
        }
    };

    Plugin.__renderActionsButtonBar = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        return new CUI.Buttonbar({
            buttons: [this.__renderActionsButton(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel)]
        });
    };

    Plugin.__renderActionsButton = function(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        const menuButtonElement = new CUI.Button({
            text: '',
            icon: new CUI.Icon({ class: 'fa-ellipsis-v' }),
            class: 'pluginDirectSelectEditSearchFylr',
            onClick: () => this.__openActionsMenu(cdata, menuElement)
        });

        const menuElement = this.__getActionsMenu(data, cdata, systemObjectId, uuid, menuButtonElement, layoutElement, objectTypeLabel);

        return menuButtonElement;
    };

    Plugin.__getActionsMenu = function(data, cdata, systemObjectId, uuid, menuButtonElement, layoutElement, objectTypeLabel) {
        const menuElement = new CUI.Menu({
            class: 'customDataTypeCommonsMenu',
            element: menuButtonElement
        });

        menuElement._auto_close_after_click = false;
        menuElement.setItemList(this.__getActionsMenuItemList(data, cdata, systemObjectId, uuid, menuElement, layoutElement, objectTypeLabel));
        return menuElement;
    };

    Plugin.__getActionsMenuItemList = function(data, cdata, systemObjectId, uuid, menuElement, layoutElement, objectTypeLabel) {
        return {
            items: [
                this.__getDetailInfoButton(cdata, menuElement),
                this.__getEditButton(cdata),
                this.__getDeleteButton(data, cdata, systemObjectId, uuid, menuElement, layoutElement, objectTypeLabel)
            ]
        };
    };

    Plugin.__openActionsMenu = function(cdata, menuElement) {
        const invalid = !this.__isValidData(cdata);
        const forbidden = !this.__hasAccessRights();

        menuElement.getItemList().getItems().done(items => {
            items.forEach(item => {
                item.disabled = item.value === 'delete'
                    ? invalid
                    : invalid || forbidden;
            });
            menuElement.show();
        });
    };

    Plugin.__getDetailInfoButton = function(cdata, menuElement) {
        return {
            text: $$('custom.data.type.vis.buttonMenu.detailInfo'),
            value: 'detail',
            icon_left: new CUI.Icon({ class: 'fa-info-circle' }),
            onClick: (_, buttonElement) =>
                this.__openDetailInfoTooltip(cdata, buttonElement, menuElement)
        };
    };

    Plugin.__openDetailInfoTooltip = function(cdata, buttonElement, menuElement) {
        const tooltip = new CUI.Tooltip({
            element: buttonElement,
            class: 'vis-plugin-detail-info-tooltip',
            placement: 'w',
            markdown: true,
            show_ms: 1000,
            hide_ms: 200,
            content: new CUI.Label({ icon: 'spinner', text: $$('custom.data.type.vis.detailInfo.loading') })
        }).show();

        CUI.Events.listen({
            type: ['click', 'dblclick', 'mouseout'],
            node: buttonElement,
            capture: true,
            only_once: true,
            call: () => menuElement ? menuElement.hide() : tooltip.hide()
        });

        this.__getDetailInfoContent(cdata).then(content => {
            tooltip.DOM.innerHTML = content;
            tooltip.autoSize();
        });
    };

    Plugin.__getDetailInfoContent = function(cdata) {
        return this.__getVISDocument(cdata.objektid, cdata.typ).then(data => {
            return '<div><b>' + $$('custom.data.type.vis.field.documentReference') + ': </b>'
                + cdata.zeichen + '</div>'
            + '<div><b>' + $$('custom.data.type.vis.field.type') + ': </b>'
                + (cdata.subtyp ?? cdata.typ) + '</div>'
            + '<div><b>' + $$('custom.data.type.vis.field.content') + ': </b>'
                + data.betreff + '</div>'
            + '<div><b>' + $$('custom.data.type.vis.field.lastChangeDate') + ': </b>'
                + data.geaendert_am + '</div>';
        });
    };

    Plugin.__getEditButton = function(cdata) {
        return {
            text: $$('custom.data.type.vis.buttonMenu.edit'),
            value: 'edit',
            icon_left: new CUI.Icon({ class: 'fa-pencil' }),
            onClick: () => {
                const editUrl = this.__getBaseConfiguration().vis_url + '/' + this.__getTypeId(cdata) + '/' + cdata.objektid;
                window.open(editUrl, '_blank');
            }
        };
    };

    Plugin.__getDeleteButton = function(data, cdata, systemObjectId, uuid, menuElement, layoutElement, objectTypeLabel) {
        return {
            text: $$('custom.data.type.vis.buttonMenu.delete'),
            value: 'delete',
            icon_left: new CUI.Icon({ class: 'fa-trash' }),
            onClick: () => {
                this.__deleteEntry(cdata, layoutElement);
                menuElement.hide();
                this.__updateEditorInput(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);
            }
        };
    };

    Plugin.__addEntry = function(entryData, data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel) {
        cdata.objektid = entryData.objektid;
        cdata.zeichen = entryData.zeichen;
        cdata.typ = entryData.typ;
        cdata.subtyp = entryData.subtyp;
        cdata._fulltext = { text: entryData.zeichen };
        cdata._standard = { text: entryData.zeichen };

        this.__updateEditorInput(data, cdata, systemObjectId, uuid, layoutElement, objectTypeLabel);
        this.__notifyEditor(layoutElement);
    };

    Plugin.__deleteEntry = function(cdata, layoutElement) {
        delete cdata.objektid;
        delete cdata.zeichen;
        delete cdata.typ;
        delete cdata.subtyp;
        delete cdata._fulltext;
        delete cdata._standard;

        this.__notifyEditor(layoutElement);
    };

    Plugin.__notifyEditor = function(layoutElement) {
        CUI.Events.trigger({
            node: layoutElement,
            type: 'editor-changed'
        });

        CUI.Events.trigger({
            node: layoutElement,
            type: 'data-changed'
        });
    };

    Plugin.__isValidData = function(cdata) {
        return cdata?.objektid && cdata?.zeichen && cdata?.typ;
    };

    Plugin.__getDocumentLabel = function(cdata) {
        return 'VIS-SmartClient: ' + cdata.zeichen + ' (' + (cdata.subtyp ?? cdata.typ) + ')';
    };

    Plugin.__createDocument = function(type, uuid, fullContent, shortContent, objectTypeLabel, title) {
        const newDocumentData = { typ: 'Akte', subtyp: type.name };

        return this.__addVISDocument(type, fullContent, shortContent)
            .then(result => {
                if (!result || parseInt(result) === NaN) throw 'visCreationUpdateFailure';
                newDocumentData.objektid = parseInt(result);
                return this.__getVISDocument(newDocumentData.objektid, 'Akte');
            }).then(newDocument => {
                if (!newDocument) throw 'visCreationReadNewDocumentFailure';
                newDocumentData.zeichen = newDocument.aktenzeichen;
                return this.__linkDocumentToObject(newDocumentData.objektid, uuid, objectTypeLabel, title);
            }).then(result => {
                if (!result) throw 'visCreationCreateLinkFailure';
                return newDocumentData;
            }).catch(errorId => {
                this.__showErrorMessage(errorId);
                return undefined;
            });
    };

    Plugin.__getVISDocument = function(documentId, type) {
        const configuration = this.__getBaseConfiguration();

        const url = configuration.api_url + '/vapiui/'
            + configuration.mandate_id + '/getSGOData/'
            + this.__getURLTypeSegment(type) + '/' + documentId;

        return this.__performMultiPartPostRequest(url);
    };

    Plugin.__addVISDocument = function(type, fullContent, shortContent) {
        const configuration = this.__getBaseConfiguration();

        const url = configuration.api_url + '/vapiui/'
            + configuration.mandate_id + '/createSGO/'
            + type.storage_identifier + '/'
            + this.__getURLTypeSegment('Akte') + '/-1';
        
        const requestData = {
            aktenplanschluessel: type.id,
            betreff: fullContent,
            kurzbezeichnung: shortContent
        };

        const subtypeFieldPathSegments = configuration.subtype_field_path?.split('.');
        if (subtypeFieldPathSegments?.length) {
            let object = requestData;
            while (subtypeFieldPathSegments.length > 1) {
                const key = subtypeFieldPathSegments.shift();
                object[key] = {};
                object = object[key];
            }
            object[subtypeFieldPathSegments.shift()] = type.name;
        }
        
        return this.__performMultiPartPostRequest(url, requestData);
    };

    Plugin.__linkDocumentToObject = function(documentId, uuid, objectTypeLabel, title) {
        const configuration = this.__getBaseConfiguration();

        const url = configuration.api_url + '/vapiui/'
            + configuration.mandate_id + '/addVerknuepfung/akteverknuepfung/' + documentId;

        let name = configuration.link_name_prefix + objectTypeLabel;
        if (title?.length) name += ', ' + title;
        
        const requestData = {
            'Name': name,
            'URL':  this.__getExternalURL() + '#/detail/' + uuid
        };
        
        return this.__performMultiPartPostRequest(url, requestData, false);
    };

    Plugin.__searchDocument = function(searchString, type) {
        const configuration = this.__getBaseConfiguration();

        const url = configuration.api_url + '/vapiui/'
            + configuration.mandate_id + '/extendedSearchSGO/'
            + (type === 'Akte' ? 'erw_aktesuchen' : 'erw_vorgangsuchen');
        
        const requestData = {
            'name': type === 'Akte' ? 'Aktenzeichen' : 'Vorgangszeichen',
            'wert': searchString
        };
        
        return this.__performPostRequest(url, requestData, 'application/json');
    };

    Plugin.__performGetRequest = function(url) {
        return fetch(url, {
            method: 'GET'
        }).then(response => {
            if (!response.ok) {
                console.error(response.status);
                return undefined;
            }
            return response.json();
        }).catch(err => {
            console.error(err);
            return undefined;
        });
    };

    Plugin.__performPostRequest = function(url, requestData, contentType) {
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: { 'Content-Type': contentType }
        }).then(response => {
            if (!response.ok) {
                console.error(response.status);
                return undefined;
            }
            return response.json();
        }).catch(err => {
            console.error(err);
            return undefined;
        });
    };

    Plugin.__performMultiPartPostRequest = function(url, requestData, returnJsonData = true) {
        return fetch(url, {
            method: 'POST',
            body: this.__buildFormData(requestData)
        }).then(response => {
            if (!response.ok) {
                console.error(response.status);
                return undefined;
            }
            return returnJsonData ? response.json() : true;
        }).catch(err => {
            console.error(err);
            return undefined;
        });
    };

    Plugin.__buildFormData = function(requestData) {
        const configuration = this.__getBaseConfiguration();

        const formData = new FormData();
        formData.append('nfi', configuration.user_information + '|' + configuration.procedure_information);
        if (requestData) formData.append('body', JSON.stringify(requestData));

        return formData;
    };

    Plugin.__getBaseConfiguration = function() {
        return ez5.session.getBaseConfig('plugin', 'custom-data-type-vis')['vis'];
    };

    Plugin.__getCreatableTypes = function() {
        return this.__getBaseConfiguration().types
            .filter(type => this.__hasCreationRights(type.name));
    };

    Plugin.__getURLTypeSegment = function(typeName) {
        const configuration = this.__getBaseConfiguration();

        return typeName === 'Akte'
            ? 'akte' + '/' + configuration.file_type_name
            : 'vorgang' + '/' + configuration.process_type_name;
    };

    Plugin.__hasAccessRights = function() {
        const groupId = this.__getBaseConfiguration().access_user_group_id;
        return !groupId || this.__getUserGroupIds().includes(groupId);
    };

    Plugin.__hasCreationRights = function(typeName) {
        if (!typeName?.length) return false;

        const typeDefinition = this.__getBaseConfiguration().types
            .find(type => type.name === typeName);
        if (!typeDefinition) return false;

        const groupId = typeDefinition.user_group_id;
        return !groupId || this.__getUserGroupIds().includes(groupId);
    };

    Plugin.__getUserGroupIds = function() {
        return ez5.session.user.data.__group_ids;
    };

    Plugin.__getExternalURL = function() {
        return ez5.session.data.instance.external_url;
    };

    Plugin.__getTypeId = function(cdata) {
        return cdata.typ === 'Akte' ? 1 : 3;
    };

    Plugin.__showErrorMessage = function(errorId) {
        const modal = new CUI.Modal({
            pane: {
                header_left: new CUI.Label({ text: $$('custom.data.type.vis.error.' + errorId + '.title') }),
                content: new CUI.Label({
                    text: $$('custom.data.type.vis.error.' + errorId + '.message'),
                    multiline: true
                }),
                footer_right: [
                    new CUI.Button({
                        text: $$('custom.data.type.vis.ok'),
                        class: 'cui-dialog',
                        primary: true,
                        onClick: () => this.__closeModal(modal)
                    })
                ]
            }
        });

        modal.autoSize();

        return modal.show();
    };

    Plugin.__closeModal = function(modal) {
        modal.hide();
        modal.destroy();
    };

    Plugin.__getObjectType = function() {
        const path = this.path();
        return path.includes('.')
            ? path.slice(0, path.indexOf('.'))
            : path;
    };

    return CustomDataTypeVIS;
})(CustomDataType);


CustomDataType.register(CustomDataTypeVIS);

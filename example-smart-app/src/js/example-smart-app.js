(function(window) {
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart) {
      console.log('18')
      if (smart.hasOwnProperty('patient')) {
        console.log('inside smart has own property')
        var patient = smart.patient;
        var user = smart.user;
        var pt = patient.read();
        var userRead = user.read();

        console.log('after user read')
        console.log(smart)
        console.log(smart.user)
        console.log(smart.patient.api)

        var hey = smart.api.create()
        console.log(hey)

        var testpatient = smart.api.create({
          "resourceType": "Patient",
          "identifier": [{
            "assigner": {
              "reference": "Organization/619848"
            }
          }],
          "active": true,
          "name": [{
              "use": "official",
              "family": [
                "Wolf"
              ],
              "given": [
                "Person",
                "Name"
              ],
              "period": {
                "start": "2010-05-17T14:54:31.000Z"
              }
            },
            {
              "use": "usual",
              "given": [
                "Bigby"
              ],
              "period": {
                "start": "2012-05-22T15:45:50.000Z"
              }
            }
          ],
          "telecom": [{
            "system": "phone",
            "value": "8168229121",
            "use": "home",
            "period": {
              "start": "2012-05-17T15:33:18.000Z"
            }
          }],
          "gender": "male",
          "birthDate": "1990-09-15",
          "address": [{
            "use": "home",
            "line": [
              "121212 Metcalf Drive",
              "Apartment 403"
            ],
            "city": "Kansas City",
            "district": "Jackson",
            "state": "KS",
            "postalCode": "64199",
            "country": "United States of America",
            "period": {
              "start": "2012-05-17T15:33:18.000Z"
            }
          }],
          "maritalStatus": {
            "coding": [{
              "system": "http://hl7.org/fhir/v3/NullFlavor",
              "code": "UNK",
              "display": "Unknown"
            }],
            "text": "Unknown"
          },
          "communication": [{
            "language": {
              "coding": [{
                "system": "urn:ietf:bcp:47",
                "code": "en",
                "display": "English"
              }],
              "text": "English"
            },
            "preferred": true
          }],
          "careProvider": [{
              "reference": "Practitioner/4594010"
            },
            {
              "reference": "Practitioner/4646007"
            }
          ]
        })


        console.log(testpatient)

        var obv = smart.patient.api.fetchAll({
          type: 'Observation',
          query: {
            code: {
              $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                'http://loinc.org|2089-1', 'http://loinc.org|55284-4'
              ]
            }
          }
        });

        var allergies = smart.patient.api.fetchAll({
          type: "AllergyIntolerance",
          interaction: [{
            "code": "read"
          }]
        });

        var updateAllergies = smart.patient.api.fetchAll({
          type: "AllergyIntolerance",
          interaction: [{
            "code": "write"
          }]
        })
        console.log('before pt obv')

        $.when(pt, obv).fail(onError);

        $.when(pt, obv, allergies, updateAllergies).done(function(patient, obv, allergies, updateAllergies) {
          console.log('inside')
          console.log('allergies', allergies)
          console.log('update allergies', updateAllergies)
          console.log('after update allergiesgi')
          console.log('pt', pt)
          console.log('obv', obv)
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);
          p.allergies = []

          //allergies
          allergies.map(function(item) {
            var substance = item.substance.text
            var status = item.status
            var criticality = item.criticality
            var cat = item.category


            var obj = {
              'substance': substance,
              'status': status,
              'criticality': criticality,
              'category': cat,

            }

            p.allergies.push(obj)
          })

          if (typeof systolicbp != 'undefined') {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
      }


    }


    // console.log('smartypants', smart)

    // console.log('after get')

    // const client = FHIR.client({
    //   serverUrl: "https://r4.smarthealthit.org"
    // });

    // const client = FHIR.client('https://r4.smarthealthit.org');
    // console.log('client', client)
    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();



  };

  function defaultPatient() {
    return {
      fname: {
        value: ''
      },
      lname: {
        value: ''
      },
      gender: {
        value: ''
      },
      birthdate: {
        value: ''
      },
      height: {
        value: ''
      },
      systolicbp: {
        value: ''
      },
      diastolicbp: {
        value: ''
      },
      ldl: {
        value: ''
      },
      hdl: {
        value: ''
      },
      allergies: {
        value: []
      }
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation) {
      var BP = observation.component.find(function(component) {
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
      return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#substance').html(p.allergies[0].substance);
    $('#status').html(p.allergies[0].status)
    $('#criticality').html(p.allergies[0].criticality)
    $('#category').html(p.allergies[0].category)
  };

})(window);